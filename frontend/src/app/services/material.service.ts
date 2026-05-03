import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Material,
  MaterialPayload,
} from '../../../../shared/interfaces/products/material.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MaterialService {
  private readonly apiUrl = `${environment.apiUrl}/materiais`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Material[]> {
    return this.http.get<Material[]>(this.apiUrl);
  }

  create(data: MaterialPayload): Observable<Material> {
    return this.http.post<Material>(this.apiUrl, data);
  }

  update(id: number, data: Partial<MaterialPayload>): Observable<Material> {
    return this.http.patch<Material>(`${this.apiUrl}/${id}`, data);
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
