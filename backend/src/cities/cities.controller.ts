import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateCityDto } from './dto/create-city.dto';
import { CitiesService } from './cities.service';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  findAll() {
    return this.citiesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCityDto) {
    return this.citiesService.create(dto);
  }
}
