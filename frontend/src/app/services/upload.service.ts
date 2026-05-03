import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadedFile {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

export interface UploadResponse {
  files: UploadedFile[];
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private readonly apiUrl = `${environment.apiUrl}/uploads`;

  constructor(private http: HttpClient) {}

  uploadProductImages(files: File[]): Observable<UploadResponse> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    return this.http.post<UploadResponse>(`${this.apiUrl}/products`, formData);
  }

  uploadEstampaImage(file: File): Observable<UploadedFile> {
    return this.uploadSingle('estampas', file);
  }

  uploadMaterialImage(file: File): Observable<UploadedFile> {
    return this.uploadSingle('materiais', file);
  }

  private uploadSingle(
    folder: 'estampas' | 'materiais',
    file: File,
  ): Observable<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<UploadedFile>(`${this.apiUrl}/${folder}`, formData);
  }
}
