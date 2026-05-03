import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Categoria,
  CategoriaPayload,
} from '../../../../shared/interfaces/products/categoria.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  private readonly apiUrl = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl);
  }

  create(data: CategoriaPayload): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, data);
  }

  update(id: number, data: Partial<CategoriaPayload>): Observable<Categoria> {
    return this.http.patch<Categoria>(`${this.apiUrl}/${id}`, data);
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
