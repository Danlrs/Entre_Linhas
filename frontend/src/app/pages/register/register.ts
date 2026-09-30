import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { brazilPhoneDigits, isValidBrazilPhoneDigits, maskBrazilPhoneInput } from '../../utils/brazil-phone';

const matchingPasswords: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.get('password')?.value === control.get('confirmPassword')?.value ? null : { passwordMismatch: true };

@Component({
  selector: 'app-register', imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html', styleUrl: './register.css',
})
export class Register implements OnInit {
  userForm!: FormGroup;
  errorMessage = '';
  isSubmitting = false;
  loadingInvitation = true;
  email = '';
  private token = '';

  constructor(private users: UserService, private fb: FormBuilder, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.userForm = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(100)]],
      login: ['', [Validators.required, Validators.pattern(/^[a-z0-9_.]{3,50}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
      telefone: ['', [Validators.required, (control: { value: string }) => isValidBrazilPhoneDigits(brazilPhoneDigits(control.value)) ? null : { brazilPhone: true }]],
    }, { validators: matchingPasswords });
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.loadingInvitation = false;
      this.errorMessage = 'Este link de convite está incompleto. Peça um novo convite ao usuário que cadastrou você.';
      return;
    }
    this.users.getInvitation(this.token).subscribe({
      next: (invite) => { this.email = invite.email; this.loadingInvitation = false; },
      error: (err) => { this.errorMessage = err?.error?.message ?? 'Este convite expirou ou já foi utilizado. Peça um novo convite.'; this.loadingInvitation = false; },
    });
  }

  onTelefoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const masked = maskBrazilPhoneInput(input.value);
    this.userForm.get('telefone')?.setValue(masked, { emitEvent: false }); input.value = masked;
  }

  onLoginInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalized = input.value.toLowerCase();
    this.userForm.get('login')?.setValue(normalized, { emitEvent: false });
    this.userForm.get('login')?.markAsDirty();
    input.value = normalized;
  }

  registerUser(): void {
    if (this.userForm.invalid || !this.email || this.isSubmitting) return;
    this.isSubmitting = true; this.errorMessage = '';
    const { nome, login, password, confirmPassword, telefone } = this.userForm.value;
    this.users.acceptInvitation({ token: this.token, nome: nome.trim(), login: login.toLowerCase(), password, confirmPassword, telefone: brazilPhoneDigits(telefone) }).subscribe({
      next: () => { this.isSubmitting = false; void this.router.navigate(['/admin'], { queryParams: { invited: '1' } }); },
      error: (err) => { this.isSubmitting = false; this.errorMessage = err?.error?.message ?? 'Não foi possível concluir o cadastro. Verifique o convite e tente novamente.'; },
    });
  }
}
