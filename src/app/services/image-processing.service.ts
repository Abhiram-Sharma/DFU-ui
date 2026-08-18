import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageProcessingService {
  constructor() {}

  async processImage(file: File | Blob): Promise<Blob> {
    const imgUrl = URL.createObjectURL(file);
    const img = await this.loadImage(imgUrl);
    
    // Target dimensions
    const targetSize = 224;
    
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    
    // Calculate square crop from center
    const size = Math.min(img.width, img.height);
    const sx = (img.width - size) / 2;
    const sy = (img.height - size) / 2;
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, targetSize, targetSize);
    
    // Draw the cropped center part to the 224x224 canvas
    ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
    
    URL.revokeObjectURL(imgUrl);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob failed'));
        }
      }, 'image/jpeg', 0.95);
    });
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }
}
