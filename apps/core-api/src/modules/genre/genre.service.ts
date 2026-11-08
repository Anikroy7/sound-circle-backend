import { Injectable } from "@nestjs/common";
import { GenreEntity } from "@soundcircle/shared/database/entities/reference/genre.entity";
import { GenreRepository } from "@soundcircle/shared/database/repositories/reference/genre.repository";

@Injectable()
export class GenreService {
  constructor(private readonly genreRepository: GenreRepository) {}

  async getAll(): Promise<GenreEntity[]> {
    return this.genreRepository.getAll();
  }
}
