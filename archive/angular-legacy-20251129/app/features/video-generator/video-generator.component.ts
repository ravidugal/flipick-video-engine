import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Topic {
  name: string;
  subtopics: string[];
}

@Component({
  selector: 'app-video-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-generator.component.html',
  styleUrls: ['./video-generator.component.scss']
})
export class VideoGeneratorComponent {
  // Step tracking
  currentStep = signal(1);
  
  // Form data
  subject = signal('');
  courseName = signal('');
  trainingType = signal('compliance');
  sceneCount = signal(15);
  
  // Topics
  topics = signal<Topic[]>([]);
  customTopicsText = signal('');
  useCustomTopics = signal(false);
  
  // Brand & Colors
  primaryColor = signal('#444ce7');
  secondaryColor = signal('#849bff');
  
  // Loading states
  loadingTopics = signal(false);
  generatingVideo = signal(false);
  
  // Error handling
  error = signal<string | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Step 1: Generate topics with AI
  async generateTopics() {
    if (!this.subject()) {
      this.error.set('Please enter a subject');
      return;
    }

    this.loadingTopics.set(true);
    this.error.set(null);

    try {
      const response = await this.http.post<any>(
        `${environment.apiUrl}/ai/topics`,
        {
          subject: this.subject(),
          trainingType: this.trainingType()
        }
      ).toPromise();

      if (response.success) {
        this.topics.set(response.topics);
        this.currentStep.set(2);
      }
    } catch (err: any) {
      this.error.set('Failed to generate topics: ' + err.message);
    } finally {
      this.loadingTopics.set(false);
    }
  }

  // Parse custom topics from textarea
  parseCustomTopics() {
    const text = this.customTopicsText();
    const lines = text.split('\n').filter(l => l.trim());
    
    const parsed: Topic[] = [];
    let currentTopic: Topic | null = null;

    lines.forEach(line => {
      if (line.startsWith('-')) {
        // Subtopic
        if (currentTopic) {
          currentTopic.subtopics.push(line.substring(1).trim());
        }
      } else {
        // New topic
        if (currentTopic) {
          parsed.push(currentTopic);
        }
        currentTopic = {
          name: line.trim(),
          subtopics: []
        };
      }
    });

    if (currentTopic) {
      parsed.push(currentTopic);
    }

    this.topics.set(parsed);
    this.useCustomTopics.set(false);
    this.currentStep.set(2);
  }

  // Add/Edit topics manually
  addTopic() {
    this.topics.update(topics => [
      ...topics,
      { name: 'New Topic', subtopics: ['Subtopic 1'] }
    ]);
  }

  removeTopic(index: number) {
    this.topics.update(topics => topics.filter((_, i) => i !== index));
  }

  addSubtopic(topicIndex: number) {
    this.topics.update(topics => {
      const updated = [...topics];
      updated[topicIndex].subtopics.push('New Subtopic');
      return updated;
    });
  }

  removeSubtopic(topicIndex: number, subtopicIndex: number) {
    this.topics.update(topics => {
      const updated = [...topics];
      updated[topicIndex].subtopics = updated[topicIndex].subtopics.filter(
        (_, i) => i !== subtopicIndex
      );
      return updated;
    });
  }

  // Step 2: Review and edit topics
  goToCustomization() {
    if (this.topics().length === 0) {
      this.error.set('Please add at least one topic');
      return;
    }
    this.currentStep.set(3);
  }

  // Step 3: Generate video
  async generateVideo() {
    if (!this.courseName()) {
      this.courseName.set(this.subject());
    }

    this.generatingVideo.set(true);
    this.error.set(null);

    try {
      const response = await this.http.post<any>(
        `${environment.apiUrl}/ai/generate-video`,
        {
          subject: this.subject(),
          courseName: this.courseName(),
          trainingType: this.trainingType(),
          topics: this.topics(),
          sceneCount: this.sceneCount(),
          brandColors: {
            primary: this.primaryColor(),
            secondary: this.secondaryColor()
          }
        }
      ).toPromise();

      if (response.success) {
        // Navigate to storyboard or project view
        this.router.navigate(['/projects', response.project.id]);
      }
    } catch (err: any) {
      this.error.set('Failed to generate video: ' + err.message);
    } finally {
      this.generatingVideo.set(false);
    }
  }

  // Navigation
  goBack() {
    this.currentStep.update(step => Math.max(1, step - 1));
  }

  reset() {
    this.currentStep.set(1);
    this.subject.set('');
    this.topics.set([]);
    this.error.set(null);
  }
}
