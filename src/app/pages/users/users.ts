import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models';
import { fmtDate } from '../../util/format';
import { UserDialog, UserDialogData } from '../../dialogs/user-dialog';

@Component({
  selector: 'tl-users',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule, MatDialogModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  readonly fmtDate = fmtDate;

  users = signal<User[]>([]);
  loading = signal(true);

  currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  constructor() {
    effect(() => {
      this.api.version();
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.getUsers().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isSelf(u: User): boolean {
    return u.id === this.currentUserId();
  }

  async add(): Promise<void> {
    await this.open();
  }

  async edit(u: User): Promise<void> {
    await this.open(u);
  }

  private async open(user?: User): Promise<void> {
    const ref = this.dialog.open(UserDialog, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: 'input',
      data: { user } as UserDialogData,
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (result === 'created') this.ui.toast('User created');
    if (result === 'updated') this.ui.toast('User updated');
  }

  async remove(u: User): Promise<void> {
    const ok = await this.ui.confirm({
      title: 'Delete user',
      message: 'This will permanently remove the user account.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteUser(u.id).subscribe({
      next: () => this.ui.toast('User deleted'),
      error: (e) => this.ui.toast(e?.error?.error || 'Could not delete user'),
    });
  }
}
