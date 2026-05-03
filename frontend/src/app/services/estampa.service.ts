import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Estampa,
  EstampaPayload,
} from '../../../../shared/interfaces/products/estampa.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EstampaService {
  private readonly apiUrl = `${environment.apiUrl}/estampas`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Estampa[]> {
    return this.http.get<Estampa[]>(this.apiUrl);
  }

  create(data: EstampaPayload): Observable<Estampa> {
    return this.http.post<Estampa>(this.apiUrl, data);
  }

  update(id: number, data: Partial<EstampaPayload>): Observable<Estampa> {
    return this.http.patch<Estampa>(`${this.apiUrl}/${id}`, data);
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
