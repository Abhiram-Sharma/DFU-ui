import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { PredictionResponse } from '../models/prediction.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  predict(imageBlob: Blob, filename: string = 'image.jpg'): Observable<PredictionResponse> {
    const formData = new FormData();
    formData.append('file', imageBlob, filename);
    
    return this.http.post<PredictionResponse>(`${this.apiUrl}/predict`, formData);
  }
}
