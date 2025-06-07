import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "../../components/header/header";

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [RouterOutlet, Header],
  templateUrl: './pages.html',
  styleUrl: './pages.scss'
})
export class Pages {

}
