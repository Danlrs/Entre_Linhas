import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../../../../shared/interfaces/users/user.interface';
import { environment } from '../../environments/environment';

export type SafeUser = Omit<User, 'password'>;

export interface UpdateProfileRequest {
  email?: string;
  nome?: string;
  telefone?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface InvitationDetails { email: string; }
export interface AcceptInvitationRequest { token: string; nome: string; login: string; password: string; confirmPassword: string; telefone: string; }

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/usuario`;

  constructor(private http: HttpClient) {}

  inviteUser(email: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${this.apiUrl}/convites`, { email });
  }

  getInvitation(token: string): Observable<InvitationDetails> {
    return this.http.get<InvitationDetails>(`${this.apiUrl}/convites/validar`, { params: { token } });
  }

  acceptInvitation(data: AcceptInvitationRequest): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${this.apiUrl}/convites/aceitar`, data);
  }

  getMe(): Observable<SafeUser> {
    return this.http.get<SafeUser>(`${this.apiUrl}/eu`).pipe(tap((user) => this.syncStoredProfile(user)));
  }

  updateMe(data: UpdateProfileRequest): Observable<SafeUser> {
    return this.http.patch<SafeUser>(`${this.apiUrl}/eu`, data).pipe(
      tap((user) => this.syncStoredProfile(user)),
    );
  }

  private syncStoredProfile(user: SafeUser): void {
    const stored = localStorage.getItem('user');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      localStorage.setItem('user', JSON.stringify({ ...parsed, nome: user.nome, email: user.email }));
    } catch {
      // ignore corrupt legacy session cache; API remains the source of truth.
    }
  }

  changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/eu/senha`, data);
  }
}
