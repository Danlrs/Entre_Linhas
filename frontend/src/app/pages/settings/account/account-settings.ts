import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService, SafeUser } from '../../../services/user.service';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-settings.html',
  styleUrl: './account-settings.css',
})
export class AccountSettings implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  loadingProfile = true;
  savingProfile = false;
  savingPassword = false;

  profileMessage: { type: 'success' | 'error'; text: string } | null = null;
  passwordMessage: { type: 'success' | 'error'; text: string } | null = null;

  user: SafeUser | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      login: ['', [Validators.required, Validators.minLength(3)]],
      telefone: [''],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });

    this.loadUser();
  }

  retryLoad(): void {
    this.profileMessage = null;
    this.loadUser();
  }

  private loadUser(): void {
    this.loadingProfile = true;
    this.profileMessage = null;
    this.cdr.detectChanges();

    this.userService.getMe().subscribe({
      next: (user) => {
        this.user = user;
        this.profileForm.patchValue({
          email: user.email,
          login: user.login,
          telefone: user.telefone ?? '',
        });
        this.profileForm.markAsPristine();
        this.loadingProfile = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        console.error('[AccountSettings] Falha ao carregar usuário:', err);
        const fallback =
          err?.status === 0
            ? 'Não foi possível conectar ao servidor. Verifique se o backend está ativo.'
            : err?.error?.message ?? 'Não foi possível carregar seus dados. Tente novamente.';
        this.profileMessage = { type: 'error', text: fallback };
        this.loadingProfile = false;
        this.cdr.detectChanges();
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile) return;

    this.savingProfile = true;
    this.profileMessage = null;

    const { email, login, telefone } = this.profileForm.value;
    const payload = {
      email,
      login,
      telefone: typeof telefone === 'string' && telefone.trim() ? telefone.trim() : null,
    };

    this.userService.updateMe(payload).subscribe({
      next: (user) => {
        this.user = user;
        this.profileForm.patchValue({
          email: user.email,
          login: user.login,
          telefone: user.telefone ?? '',
        });
        this.profileForm.markAsPristine();
        this.savingProfile = false;
        this.profileMessage = { type: 'success', text: 'Dados atualizados com sucesso!' };
      },
      error: (err) => {
        this.savingProfile = false;
        this.profileMessage = {
          type: 'error',
          text: err?.error?.message ?? 'Erro ao atualizar seus dados. Tente novamente.',
        };
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword) return;

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.passwordMessage = { type: 'error', text: 'As senhas não coincidem.' };
      return;
    }

    this.savingPassword = true;
    this.passwordMessage = null;

    this.userService.changePassword({ currentPassword, newPassword }).subscribe({
      next: (res) => {
        this.savingPassword = false;
        this.passwordForm.reset();
        this.passwordMessage = { type: 'success', text: res.message ?? 'Senha alterada com sucesso!' };
      },
      error: (err) => {
        this.savingPassword = false;
        this.passwordMessage = {
          type: 'error',
          text: err?.error?.message ?? 'Erro ao alterar a senha. Verifique a senha atual.',
        };
      },
    });
  }
}
