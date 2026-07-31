import dotenv from 'dotenv';

dotenv.config();

console.log('⚡ [Worker] Saarthi AI BullMQ Task Worker process initialized');
console.log('⌛ Waiting for background job queues...');

const handleShutdown = () => {
  console.log('🛑 [Worker] Graceful shutdown initiated...');
  process.exit(0);
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
