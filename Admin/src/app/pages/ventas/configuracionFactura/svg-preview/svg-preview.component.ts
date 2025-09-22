import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-svg-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [style.width]="width + 'px'" [style.height]="height + 'px'" 
         [style.border]="'1px solid #d6b68a'" [style.border-radius]="'8px'" 
         [style.overflow]="'hidden'" [style.display]="'flex'" 
         [style.align-items]="'center'" [style.justify-content]="'center'">
      <img *ngIf="previewUrl" [src]="previewUrl" [alt]="alt || 'SVG Preview'"
           [style.width]="'100%'" [style.height]="'100%'" 
           [style.object-fit]="'contain'" [style.object-position]="'center'" />
      <div *ngIf="!previewUrl" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
        <i class="ri-camera-line" style="font-size: 2rem; color: #878c9c;"></i>
      </div>
    </div>
  `
})
export class SvgPreviewComponent implements OnChanges {
  @Input() file: File | null = null;
  @Input() imageUrl: string = '';
  @Input() width: number = 120;
  @Input() height: number = 120;
  @Input() alt: string = '';

  previewUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    // If file is provided, create a preview from the file
    if (changes['file'] && this.file) {
      this.createPreviewFromFile(this.file);
    } 
    // If imageUrl is provided, use it directly
    else if (changes['imageUrl'] && this.imageUrl) {
      this.previewUrl = this.imageUrl;
    }
  }

  private createPreviewFromFile(file: File): void {
    // Check if it's an SVG file
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      // For non-SVG files, we'll still create a preview
      // This allows the component to be used for all image types
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
}
