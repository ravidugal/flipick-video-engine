import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoGenerator } from './video-generator';

describe('VideoGenerator', () => {
  let component: VideoGenerator;
  let fixture: ComponentFixture<VideoGenerator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoGenerator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoGenerator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
