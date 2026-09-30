import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-users-settings', standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users-settings.html',
})
export class UsersSettings {
  readonly form: FormGroup;
  busy = false;
  success = '';
  error = '';

  constructor(private fb: FormBuilder, private users: UserService) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  }

  sendInvite(): void {
    if (this.form.invalid || this.busy) return;
    this.busy = true; this.success = ''; this.error = '';
    this.users.inviteUser(this.form.controls['email'].value!.trim()).subscribe({
      next: () => { this.busy = false; this.success = 'Convite enviado. A pessoa receberá um link válido por 48 horas.'; this.form.reset(); },
      error: (err) => { this.busy = false; this.error = err?.error?.message ?? 'Não foi possível enviar o convite. Tente novamente.'; },
    });
  }
}
