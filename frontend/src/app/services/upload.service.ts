import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, switchMap, from, concatMap, toArray, map } from 'rxjs';
import { compressImage } from '../utils/compress-image';
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
    // Sequencial: não decodificar várias fotos grandes ao mesmo tempo.
    return from(files).pipe(concatMap((file) => defer(() => compressImage(file)).pipe(
      switchMap((prepared) => {
        const data = new FormData();
        data.append('files', prepared, prepared.name);
        return this.http.post<UploadResponse>(`${this.apiUrl}/products`, data);
      }),
    )), toArray(), map((responses) => ({ files: responses.flatMap((response) => response.files) })));
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
    return defer(() => compressImage(file)).pipe(switchMap((prepared) => {
      const formData = new FormData();
      formData.append('file', prepared, prepared.name);
      return this.http.post<UploadedFile>(`${this.apiUrl}/${folder}`, formData);
    }));
  }
}
