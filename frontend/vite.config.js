// react서버 돌릴떄 설정값 모아두는 파일임
import {defineConfig} from 'vite';// 바이트 들고오기
import react from '@vitejs/plugin-react';// 문법 이해시키기

export default defineConfig({
  plugins:[react()],
  server:{
    port:5173,
    proxy:{
      '/api':{
        target:'http://localhost:5000',
        changeOrigin:true,
      },
    },
  },
});