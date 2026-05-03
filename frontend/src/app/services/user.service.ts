import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../../../../shared/interfaces/users/user.interface';
import { environment } from '../../environments/environment';

export type SafeUser = Omit<User, 'password'>;

export interface RegisterRequest {
  email: string;
  login: string;
  password: string;
  telefone?: string;
}

export interface UpdateProfileRequest {
  email?: string;
  login?: string;
  telefone?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/usuario`;

  constructor(private http: HttpClient) {}

  registerUser(data: RegisterRequest): Observable<SafeUser> {
    return this.http.post<SafeUser>(`${this.apiUrl}/cadastro`, data);
  }

  getMe(): Observable<SafeUser> {
    return this.http.get<SafeUser>(`${this.apiUrl}/eu`);
  }

  updateMe(data: UpdateProfileRequest): Observable<SafeUser> {
    return this.http.patch<SafeUser>(`${this.apiUrl}/eu`, data).pipe(
      tap((user) => {
        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            localStorage.setItem(
              'user',
              JSON.stringify({ ...parsed, login: user.login, email: user.email }),
            );
          } catch {
            // ignore parse errors
          }
        }
      }),
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/eu/senha`, data);
  }
}
