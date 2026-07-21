import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  private theme = inject(ThemeService);

  constructor() {
    // Apply the saved/system theme globally (covers the login page too).
    this.theme.init();
  }
}
