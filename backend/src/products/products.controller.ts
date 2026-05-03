import { Controller, Get, Post, Delete, Param, Body, Patch, ParseIntPipe, UseGuards } from "@nestjs/common";
import { ProductService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";

@Controller('produtos')
export class ProductController{
    constructor(private readonly productService: ProductService){}

    @Get()
    getAllProducts() {
        return this.productService.getAllProducts();
    }

    @Get(':id')
    getProductById(@Param('id', ParseIntPipe) id: number){
        return this.productService.getProductById(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    createProduct(@Body() dto: CreateProductDto){
        return this.productService.createProduct(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto){
        return this.productService.updateProduct(id, dto);
    }
    
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    deleteProduct(@Param('id', ParseIntPipe) id: number){
        return this.productService.deleteProduct(id);
    }
}
