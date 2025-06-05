import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './pages.html',
  styleUrl: './pages.scss'
})
export class Pages {

}
