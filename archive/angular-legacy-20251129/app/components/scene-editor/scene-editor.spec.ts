import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SceneEditor } from './scene-editor';

describe('SceneEditor', () => {
  let component: SceneEditor;
  let fixture: ComponentFixture<SceneEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceneEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SceneEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
