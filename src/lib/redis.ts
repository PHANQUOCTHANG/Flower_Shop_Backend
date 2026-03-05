// import Redis from 'ioredis';

// const redisClient = new Redis({
//     // Sử dụng biến môi trường hoặc gán giá trị mặc định an toàn
//     port: parseInt(process.env.REDIS_PORT || '6379'), 
//     host: process.env.REDIS_HOST || '127.0.0.1', 
//     password: process.env.REDIS_PASSWORD,
    
//     // Đặt tên cơ sở dữ liệu (DB index) nếu cần (mặc định là 0)
//     db: parseInt(process.env.REDIS_DB || '0'), 
    
//     // Tối ưu hóa kết nối
//     maxRetriesPerRequest: 1, // Hạn chế số lần thử lại nếu kết nối mất
//     retryStrategy: (times: number) => {
//         // Tùy chỉnh chiến lược thử lại (ví dụ: chờ lâu hơn sau mỗi lần thất bại)
//         const delay = Math.min(times * 50, 2000); 
//         return delay;
//     }
// });
// // ... (các sự kiện on('connect'), on('error') giữ nguyên)


// export default redisClient ;