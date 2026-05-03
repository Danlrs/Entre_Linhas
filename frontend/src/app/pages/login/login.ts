import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {

  authForm!: FormGroup;
  errorMessage = '';
  isSubmitting = false;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
  ){}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['']);
    }

    if (this.route.snapshot.queryParamMap.get('sessionExpired') === '1') {
      this.errorMessage = 'Sua sessão expirou. Faça login novamente para continuar.';
    }

    this.authForm = this.fb.group({
      login: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  loginUser(): void {
    if (this.authForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const { login, password } = this.authForm.value;
    this.authService.login({ login, password }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['']);
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Usuário ou senha incorretos.';
      }
    });
  }
}
