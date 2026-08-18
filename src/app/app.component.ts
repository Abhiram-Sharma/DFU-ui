import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionService } from './services/prediction.service';
import { ImageProcessingService } from './services/image-processing.service';
import { PredictionResponse } from './models/prediction.model';

type AppState = 'landing' | 'preview' | 'loading' | 'result' | 'error';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private predictionService = inject(PredictionService);
  private imageService = inject(ImageProcessingService);

  state: AppState = 'landing';
  
  // Image data
  selectedFile: File | Blob | null = null;
  previewUrl: string | null = null;
  processedImageBlob: Blob | null = null;
  
  // Result data
  predictionResult: PredictionResponse | null = null;
  
  // Error state
  errorMessage: string = '';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraVideo') cameraVideo!: ElementRef<HTMLVideoElement>;
  
  isCameraActive = false;
  cameraStream: MediaStream | null = null;

  // 1. Trigger File Upload
  triggerUpload() {
    this.fileInput.nativeElement.click();
  }

  // 2. Handle File Selection
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      await this.processAndPreviewImage(file);
    }
  }

  // 3. Start Camera
  async startCamera() {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      this.isCameraActive = true;
      setTimeout(() => {
        if (this.cameraVideo && this.cameraVideo.nativeElement) {
          this.cameraVideo.nativeElement.srcObject = this.cameraStream;
        }
      }, 0);
    } catch (err) {
      this.showError('Camera access was not available. You can upload a photo instead.');
    }
  }

  // 4. Capture from Camera
  async capturePhoto() {
    if (!this.cameraVideo || !this.cameraVideo.nativeElement) return;
    
    const video = this.cameraVideo.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          this.stopCamera();
          await this.processAndPreviewImage(blob);
        }
      }, 'image/jpeg', 0.95);
    }
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.isCameraActive = false;
  }

  // 5. Process Image (to 224x224) and Preview
  async processAndPreviewImage(fileOrBlob: File | Blob) {
    try {
      // Process to exactly 224x224
      this.processedImageBlob = await this.imageService.processImage(fileOrBlob);
      
      // Create preview URL
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
      }
      this.previewUrl = URL.createObjectURL(this.processedImageBlob);
      
      this.state = 'preview';
    } catch (error) {
      this.showError('This image could not be processed. Please select another image.');
    }
  }

  // 6. Analyze Photo
  analyzePhoto() {
    if (!this.processedImageBlob) return;
    
    console.log('[UI STATE] changing to: loading');
    this.state = 'loading';
    
    console.log('[PREDICT REQUEST] API URL:', this.predictionService['apiUrl'] + '/predict');
    console.log('[PREDICT REQUEST] File/blob:', this.processedImageBlob);
    console.log('[PREDICT REQUEST] Filename: image.jpg');

    this.predictionService.predict(this.processedImageBlob).subscribe({
      next: (res) => {
        console.log('[PREDICT SUCCESS] Raw API response:', res);
        console.log('[PREDICT SUCCESS] predicted_class:', res?.predicted_class);
        console.log('[PREDICT SUCCESS] confidence:', res?.confidence);
        console.log('[PREDICT SUCCESS] probabilities:', res?.probabilities);
        console.log('[PREDICT SUCCESS] filename:', res?.filename);
        
        console.log('[UI STATE] changing to: result');
        this.predictionResult = res;
        this.state = 'result';
      },
      error: (err) => {
        console.error('[PREDICT ERROR]', err);
        console.log('[UI STATE] changing to: error');
        this.errorMessage = `HTTP Status: ${err.status}. Error: ${err.message}. Details: ${JSON.stringify(err.error)}`;
        this.state = 'error';
      },
      complete: () => {
        console.log('[PREDICT COMPLETE]');
      }
    });
  }

  // 7. Reset state
  reset() {
    this.state = 'landing';
    this.predictionResult = null;
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
    this.processedImageBlob = null;
    this.errorMessage = '';
    
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
  
  cancelCamera() {
    this.stopCamera();
  }

  showError(msg: string) {
    this.errorMessage = msg;
    this.state = 'error';
  }

  // Helpers for Result Screen
  get isUlcer(): boolean {
    return this.predictionResult?.predicted_class === 'Abnormal(Ulcer)';
  }

  get resultTitle(): string {
    return this.isUlcer ? 'Possible Ulcer Detected' : 'No Ulcer Detected';
  }

  get resultExplanation(): string {
    return this.isUlcer 
      ? 'The image shows features that the AI model associates with an abnormal or ulcer condition.'
      : 'The image appears consistent with healthy skin according to the AI model.';
  }

  get formattedConfidence(): string {
    if (!this.predictionResult) return '0.00%';
    return (this.predictionResult.confidence * 100).toFixed(2) + '%';
  }
  
  get ulcerProbability(): number {
    return (this.predictionResult?.probabilities['Abnormal(Ulcer)'] || 0) * 100;
  }
  
  get healthyProbability(): number {
    return (this.predictionResult?.probabilities['Normal(Healthy skin)'] || 0) * 100;
  }

  get uploadedFilename(): string {
    return this.predictionResult?.filename || '';
  }
}
