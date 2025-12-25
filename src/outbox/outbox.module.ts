// src/outbox/outbox.module.ts
import { Module } from '@nestjs/common';
import { OutboxProcessorService } from '../outbox/processor/processor.service';

@Module({
  providers: [OutboxProcessorService],
})
export class OutboxModule {} // 👈 LỖI CỦA BẠN LÀ THIẾU TỪ 'export' Ở ĐÂY