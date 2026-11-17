import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from './loader.service';

/** Shows the global loader for every API call, whether it succeeds, fails or is cancelled. */
export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoaderService);
  loader.start();
  return next(req).pipe(finalize(() => loader.stop()));
};
