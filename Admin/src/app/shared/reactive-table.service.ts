import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReactiveTableService<T> {
  sortField: keyof T | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  public data$ = new BehaviorSubject<T[]>([]);
  private searchTerm$ = new BehaviorSubject<string>('');
  private page$ = new BehaviorSubject<number>(1);
  private pageSize = 10;
  private searchFields: (keyof T)[] = [];
  private autoFields = true;

  sortBy(field: keyof T) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.page$.next(1); // reset page on sort
  }

  setConfig(fields: (keyof T)[]) {
    this.searchFields = fields;
    this.autoFields = false;
  }

  setData(data: T[]) {
    this.data$.next(data);
    this.page$.next(1); // reset page on new data
    if (this.autoFields && data.length > 0) {
      this.searchFields = Object.keys(data[0] as object) as (keyof T)[];
    }
  }

  setSearchTerm(term: string) {
    this.searchTerm$.next(term);
    this.page$.next(1); // reset page on search
  }

  setPage(page: number) {
    this.page$.next(page);
  }

  get paginated$(): Observable<T[]> {
    return combineLatest([this.data$, this.searchTerm$, this.page$]).pipe(
      map(([data, search, page]) => {
        let filtered = data;
        if (search && search.trim() && this.searchFields.length) {
          const term = search.toLowerCase();
          filtered = data.filter(item =>
            this.searchFields.some(field =>
              ((item[field] || '') + '').toLowerCase().includes(term)
            )
          );
        }
        // Ordenamiento
        if (this.sortField) {
          filtered = [...filtered].sort((a, b) => {
            const aValue = a[this.sortField!];
            const bValue = b[this.sortField!];
            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return this.sortDirection === 'asc' ? -1 : 1;
            if (bValue == null) return this.sortDirection === 'asc' ? 1 : -1;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
              return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }
            return this.sortDirection === 'asc'
              ? (('' + aValue).localeCompare('' + bValue, undefined, { sensitivity: 'base' }))
              : (('' + bValue).localeCompare('' + aValue, undefined, { sensitivity: 'base' }));
          });
        }
        const start = (page - 1) * this.pageSize;
        return filtered.slice(start, start + this.pageSize);
      })
    );
  }

  get total$(): Observable<number> {
    return combineLatest([this.data$, this.searchTerm$]).pipe(
      map(([data, search]) => {
        if (search && search.trim() && this.searchFields.length) {
          const term = search.toLowerCase();
          return data.filter(item =>
            this.searchFields.some(field =>
              ((item[field] || '') + '').toLowerCase().includes(term)
            )
          ).length;
        }
        return data.length;
      })
    );
  }

  get page(): number {
    return this.page$.value;
  }
  get pageSizeValue(): number {
    return this.pageSize;
  }
  get searchTerm(): string {
    return this.searchTerm$.value;
  }
}
