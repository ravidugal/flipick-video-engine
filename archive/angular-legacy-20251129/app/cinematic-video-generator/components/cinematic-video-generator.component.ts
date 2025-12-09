import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { 
  VideoGeneratorService, 
  IVideoGenerationConfig, 
  IVideoProject,
  ISceneInput,
  IGenerationProgress 
} from '../services/video-generator.service';
import { 
  VideoTemplateService, 
  IVideoTemplate,
  IndustryType, 
  TemplateCategory,
  IThemeConfig 
} from '../services/video-template.service';
import { 
  ElevenLabsVoiceService, 
  IVoiceConfig, 
  ILanguageConfig,
  CURATED_VOICES,
  VOICE_PRESETS,
  SUPPORTED_LANGUAGES 
} from '../services/eleven-labs-voice.service';
import { 
  StockAssetService
} from '../services/stock-asset.service';

// ============================================
// INTERFACES
// ============================================
interface IWizardStep {
  id: number;
  title: string;
  icon: string;
  completed: boolean;
}

interface ITopic {
  name: string;
  subtopics: string[];
}

// ============================================
// COMPONENT
// ============================================
@Component({
  selector: 'app-cinematic-video-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cinematic-video-generator.component.html',
  styleUrls: ['./cinematic-video-generator.component.css']
})
export class CinematicVideoGeneratorComponent implements OnInit, OnDestroy {
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('audioPreview') audioPreview!: ElementRef<HTMLAudioElement>;

  // ============================================
  // STATE
  // ============================================
  
  private destroy$ = new Subject<void>();
  
  // Wizard State
  currentStep = 1;
  totalSteps = 5;
  wizardSteps: IWizardStep[] = [
    { id: 1, title: 'Topics', icon: '📚', completed: false },
    { id: 2, title: 'Brand & Colors', icon: '🎨', completed: false },
    { id: 3, title: 'Voice', icon: '🎙️', completed: false },
    { id: 4, title: 'Settings', icon: '⚙️', completed: false },
    { id: 5, title: 'Generate', icon: '🎬', completed: false }
  ];

  // Form
  configForm!: FormGroup;

  // Topics Management
  topics: ITopic[] = [];
  topicsTab: 'ai' | 'paste' = 'ai';
  isGeneratingTopics = false;
  customTopicsText = '';

  // Options
  languages: ILanguageConfig[] = SUPPORTED_LANGUAGES;
  voicePresets = Object.keys(VOICE_PRESETS);
  availableVoices: IVoiceConfig[] = [];
  
  // Generation State
  isGenerating = false;
  generationProgress: IGenerationProgress = { stage: 'idle', progress: 0, message: '' };
  generatedProject: IVideoProject | null = null;
  generatedHTML: SafeHtml | null = null;
  rawHTML = '';
  
  // Preview State
  isPreviewOpen = false;
  isVoicePreviewPlaying = false;

  // Templates
  templates: IVideoTemplate[] = [];

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private videoGenerator: VideoGeneratorService,
    private templateService: VideoTemplateService,
    private voiceService: ElevenLabsVoiceService,
    private assetService: StockAssetService
  ) {
    this.initForm();
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit(): void {
    this.setupFormWatchers();
    this.updateVoicesForLanguage('en-US');
    
    // Subscribe to generation progress
    this.videoGenerator.getGenerationProgress()
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.generationProgress = progress;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // FORM SETUP
  // ============================================

  private initForm(): void {
    this.configForm = this.fb.group({
      // Step 1: Topics
      subject: ['', [Validators.required, Validators.minLength(3)]],
      context: [''],
      trainingType: ['compliance'],
      sceneCount: [15, [Validators.required, Validators.min(5), Validators.max(50)]],
      
      // Step 2: Branding
      projectName: ['', [Validators.required, Validators.minLength(3)]],
      primaryColor: ['#444ce7'],
      secondaryColor: ['#849bff'],
      logoUrl: [''],
      
      // Step 3: Voice
      language: ['en-US', Validators.required],
      voiceId: ['EXAVITQu4vr4xnSDxMaL', Validators.required],
      
      // Step 4: Settings
      enableVoiceOver: [true],
      enableKenBurns: [true],
      enableFilmGrain: [true]
    });
  }

  private setupFormWatchers(): void {
    // Watch language changes
    this.configForm.get('language')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.updateVoicesForLanguage(lang);
      });
  }

  // ============================================
  // TOPICS GENERATION
  // ============================================

  /**
   * Generate topics with AI
   */
  generateTopics(): void {
    const subject = this.configForm.get('subject')?.value;
    const trainingType = this.configForm.get('trainingType')?.value;

    if (!subject) {
      alert('Please enter a subject');
      return;
    }

    this.isGeneratingTopics = true;
    this.topics = [];

    this.videoGenerator.generateTopics(subject, trainingType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isGeneratingTopics = false;
          
          if (response.success && response.topics) {
            this.topics = response.topics;
            console.log('✅ Generated topics:', this.topics);
          } else {
            alert('Failed to generate topics. Please try again.');
          }
        },
        error: (error) => {
          this.isGeneratingTopics = false;
          console.error('❌ Topics generation error:', error);
          alert('Error generating topics: ' + error.message);
        }
      });
  }

  /**
   * Parse custom topics from textarea
   */
  parseCustomTopics(): void {
    if (!this.customTopicsText.trim()) {
      alert('Please enter topics');
      return;
    }

    const lines = this.customTopicsText.split('\n').map(l => l.trim()).filter(l => l);
    const parsedTopics: ITopic[] = [];
    let currentTopic: ITopic | null = null;

    for (const line of lines) {
      if (line.startsWith('-') || line.startsWith('•')) {
        // Subtopic
        if (currentTopic) {
          currentTopic.subtopics.push(line.substring(1).trim());
        }
      } else {
        // New topic
        if (currentTopic) {
          parsedTopics.push(currentTopic);
        }
        currentTopic = { name: line, subtopics: [] };
      }
    }

    if (currentTopic) {
      parsedTopics.push(currentTopic);
    }

    this.topics = parsedTopics;
    console.log('✅ Parsed topics:', this.topics);
  }

  /**
   * Add empty topic
   */
  addTopic(): void {
    this.topics.push({ name: 'New Topic', subtopics: [] });
  }

  /**
   * Remove topic
   */
  removeTopic(index: number): void {
    this.topics.splice(index, 1);
  }

  /**
   * Add subtopic to topic
   */
  addSubtopic(topicIndex: number): void {
    this.topics[topicIndex].subtopics.push('New Subtopic');
  }

  /**
   * Remove subtopic
   */
  removeSubtopic(topicIndex: number, subtopicIndex: number): void {
    this.topics[topicIndex].subtopics.splice(subtopicIndex, 1);
  }

  // ============================================
  // VIDEO GENERATION
  // ============================================

  generateVideo(): void {
    if (!this.configForm.valid) {
      alert('Please fill in all required fields');
      return;
    }

    if (this.topics.length === 0) {
      alert('Please generate or paste topics first');
      return;
    }

    const formValue = this.configForm.value;

    const config: IVideoGenerationConfig = {
      projectName: formValue.projectName,
      subject: formValue.subject,
      industry: 'general',
      category: formValue.trainingType,
      trainingType: formValue.trainingType,
      sceneCount: formValue.sceneCount,
      customTopics: this.topics,
      voiceConfig: {
        voiceId: formValue.voiceId,
        voiceName: this.getSelectedVoice()?.voiceName || 'Default',
        language: formValue.language
      },
      themeConfig: {
        primaryColor: formValue.primaryColor,
        secondaryColor: formValue.secondaryColor
      }
    };

    console.log('�� Starting video generation with config:', config);

    this.isGenerating = true;
    this.generationProgress = { stage: 'Initializing', progress: 10, message: 'Starting video generation...' };

    this.videoGenerator.generateVideo(config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (project) => {
          this.isGenerating = false;
          this.generatedProject = project;
          
          console.log('✅ Video generated successfully:', project);
          
          // Generate HTML preview
          this.rawHTML = this.videoGenerator.generateHTML(project);
          this.generatedHTML = this.sanitizer.bypassSecurityTrustHtml(this.rawHTML);
          
          // Update preview
          this.updatePreview();
          
          alert(`✅ Video generated successfully!\nProject ID: ${project.id}\nScenes: ${project.scenes.length}`);
        },
        error: (error) => {
          this.isGenerating = false;
          console.error('❌ Generation error:', error);
          alert('Video generation failed: ' + error.message);
        }
      });
  }

  // ============================================
  // VOICE MANAGEMENT
  // ============================================

  private updateVoicesForLanguage(language: string): void {
    const langCode = language.split('-')[0];
    this.availableVoices = CURATED_VOICES.filter(v => 
      v.language?.toLowerCase().includes(langCode.toLowerCase())
    );
    
    // If current voice not available, select first
    const currentVoiceId = this.configForm.get('voiceId')?.value;
    const voiceExists = this.availableVoices.some(v => v.voiceId === currentVoiceId);
    
    if (!voiceExists && this.availableVoices.length > 0) {
      this.configForm.patchValue({ voiceId: this.availableVoices[0].voiceId });
    }
  }

  getSelectedVoice(): IVoiceConfig | undefined {
    const voiceId = this.configForm.get('voiceId')?.value;
    return CURATED_VOICES.find(v => v.voiceId === voiceId);
  }

  previewVoice(): void {
    const voice = this.getSelectedVoice();
    if (!voice?.sampleUrl) {
      alert('No preview available for this voice');
      return;
    }

    if (this.audioPreview) {
      this.audioPreview.nativeElement.src = voice.sampleUrl;
      this.audioPreview.nativeElement.play();
      this.isVoicePreviewPlaying = true;

      this.audioPreview.nativeElement.onended = () => {
        this.isVoicePreviewPlaying = false;
      };
    }
  }

  stopVoicePreview(): void {
    if (this.audioPreview) {
      this.audioPreview.nativeElement.pause();
      this.audioPreview.nativeElement.currentTime = 0;
      this.isVoicePreviewPlaying = false;
    }
  }

  // ============================================
  // PREVIEW MANAGEMENT
  // ============================================

  private updatePreview(): void {
    if (this.previewFrame && this.rawHTML) {
      const iframe = this.previewFrame.nativeElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(this.rawHTML);
        doc.close();
      }
    }
  }

  openPreview(): void {
    this.isPreviewOpen = true;
    setTimeout(() => this.updatePreview(), 100);
  }

  closePreview(): void {
    this.isPreviewOpen = false;
  }

  // ============================================
  // WIZARD NAVIGATION
  // ============================================

  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.wizardSteps[this.currentStep - 1].completed = true;
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    this.currentStep = step;
  }

  // ============================================
  // DOWNLOAD
  // ============================================

  downloadHTML(): void {
    if (!this.rawHTML) {
      alert('Please generate a video first');
      return;
    }

    const blob = new Blob([this.rawHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.configForm.get('projectName')?.value || 'video'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
