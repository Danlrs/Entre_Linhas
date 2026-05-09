import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import {
  brazilPhoneOptionalValidator,
  maskBrazilPhoneInput,
  normalizeBrazilPhoneForApi,
} from '../../utils/brazil-phone';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  userForm!: FormGroup;
  errorMessage = '';
  isSubmitting = false;

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      login: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      telefone: ['', brazilPhoneOptionalValidator()],
    });
  }

  onTelefoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const masked = maskBrazilPhoneInput(input.value);
    this.userForm.get('telefone')?.setValue(masked, { emitEvent: false });
    input.value = masked;
  }

  registerUser(): void {
    if (this.userForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const { email, login, password, telefone } = this.userForm.value;
    const phone = normalizeBrazilPhoneForApi(telefone);
    this.userService.registerUser({ email, login, password, telefone: phone }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message ?? 'Erro ao realizar cadastro. Tente novamente.';
      },
    });
  }
}
