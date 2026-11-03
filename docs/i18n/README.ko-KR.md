# HALDER (हलधर) — 농가 직거래 마켓플레이스 및 물류 생태계

[![HALDER CI/CD Pipeline](https://github.com/lavesh69/halder-app/actions/workflows/ci.yml/badge.svg)](https://github.com/lavesh69/halder-app/actions/workflows/ci.yml)
[![Build Android APK & AAB](https://github.com/lavesh69/halder-app/actions/workflows/build-apk.yml/badge.svg)](https://github.com/lavesh69/halder-app/actions/workflows/build-apk.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%E2%89%A522.5.0-brightgreen.svg)](https://nodejs.org/)

**HALDER** (हलधर)는 인도 전역의 소농 및 기업형 농가와 일반 소비자, 대량 구매자, 요식업체를 직접 연결하는 엔터프라이즈급 농산물 직거래 플랫폼입니다. 다단계 중간 유통을 줄여 농가의 이익을 극대화하고, 반경 300km 이내의 당일 아침 수확 농산물을 소비자에게 제공합니다.

---

## 🌾 핵심 시스템 모듈

### 1. 소비자 및 구매 경험
- **하이퍼로컬 위치 기반 탐색:** 하버사인(Haversine) 공식을 활용한 반경 300km 지역 내 농가 탐색.
- **수확 및 신선도 정보:** 아침 수확 태그, 유기농 인증, 투명한 생산자 정보.
- **스마트 장바구니:** 농가 직배송, 콜드체인 배송, 직접 수령 지원.
- **안전한 배송 인증:** OTP 기반 수령 확인 및 실시간 배송 현황.
- **실시간 농가 대화:** 웹소켓 기반 5개 국어(영어, 힌디어, 펀자브어, 벵골어, 마라티어) 번역 채팅.

### 2. 농가 관리 시스템
- **농장 프로필 및 토지 등록:** 토양, 관개 시설, 인증 내역 및 수확 일정 관리.
- **작물 및 재고 관리:** 다중 단위(kg, 단, 상자, 리터) 지원, 당일 판매 재고 설정.
- **도매시장(Mandi) 시세:** APMC 실시간 시세 연동, 과거 벤치마크 및 CSV 리포트 추출.
- **정산 및 정산금 관리:** 매출 집계, 10% 플랫폼 수수료 자동 정산, 출금 내역 확인.

### 3. 물류 및 배송 파트너 네트워크
- **배송원 등록 및 검증:** 오토바이, 소형 트럭, 냉장 차량, 트랙터 등록 및 면허 검증.
- **실시간 위치 텔레메트리:** GPS 좌표 유효성(-90 <= lat <= 90, -180 <= lng <= 180) 및 계정 소유권 확인.
- **물류 성과 분석:** 데이터베이스 기반의 평균 배송 시간 및 정시 배송률 분석.
- **Kisan 농가 직접 배송:** 농가가 직접 배송하는 수수료 0% 배송 옵션.

### 4. B2B 도매 및 계약 재배
- **대량 주문 견적(RFQ):** 최소 주문 수량(MOQ), 수량별 할인, 자동 견적.
- **계약 재배 체결:** 단계별 수확 인도 일정에 맞춘 사전 구매 계약.

### 5. 관리자 운영 및 거버넌스
- **역할 기반 접근 제어 (RBAC):** 고객, 농가, 배송원, 관리자 권한 분리.
- **IDOR 보안:** 주문, 상품 및 위치 데이터의 비인가 접근 원천 차단.
- **농가 KYC 인증:** 신분증 및 토지 소유 문서 검증.
- **감사 로그:** 불변의 운영 감사 기록 유지.

---

## 🛠️ 기술 스택

- **프론트엔드:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **모바일 앱:** Capacitor 8 Android SDK
- **백엔드:** Node.js (>=22.5.0), Express.js, TypeScript
- **데이터베이스:** SQLite 3 (`node:sqlite` DatabaseSync, WAL 모드)
- **실시간 통신:** WebSocket (`ws`)

---

## 🚀 시작하기

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션 및 시드
npm run server:seed

# 백엔드 서버 구동 (http://localhost:5000)
npm run server

# 프론트엔드 개발 서버 구동 (http://localhost:5173)
npm run dev
```

## 📄 라이선스

본 프로젝트는 [MIT License](LICENSE)에 따라 배포됩니다.
