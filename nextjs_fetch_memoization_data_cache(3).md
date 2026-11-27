# Next.js 캐싱 가이드 — v14 · v15 · v16

> App Router 학습용 | 캐싱하기 → 캐싱하지 않기 → 기존 캐시 갱신하기
>
> 예제는 서버에서 실행되는 TypeScript 코드 기준이다. `db`, `url`, `prisma` 등은 프로젝트에 맞게 연결한다.

## 목차

1. [핵심 개념과 버전 차이](#1-핵심-개념과-버전-차이)
2. [캐싱하는 방법](#2-캐싱하는-방법)
3. [v16의 use cache](#3-v16의-use-cache)
4. [캐시를 사용하지 않는 방법](#4-캐시를-사용하지-않는-방법)
5. [기존 캐시를 갱신하는 방법](#5-기존-캐시를-갱신하는-방법)
6. [실제 테스트와 주의사항](#6-실제-테스트와-주의사항)
7. [상황별 선택표](#7-상황별-선택표)
8. [공식 문서](#8-공식-문서)

## 1. 핵심 개념과 버전 차이

캐싱은 이전 결과를 기억하고 재사용하는 것이다. 무엇을 기억하는지에 따라 기능이 다르다.

| 종류 | 무엇을 기억하는가? | 어디서? | 얼마나? |
|---|---|---|---|
| Request Memoization | 동일한 요청 또는 함수 결과 | 서버 | 한 번의 서버 렌더링 |
| Data Cache | API 응답, 함수 결과 | 서버 | 여러 요청에 걸쳐 |
| Full Route Cache | HTML 및 RSC Payload | 서버 | 정적 결과 재검증 전까지 |
| Router Cache | 페이지 이동에 필요한 RSC Payload | 브라우저 | 이동 및 캐시 정책에 따라 |
| `use cache` | 함수 또는 컴포넌트 결과 | 서버 중심 | `cacheLife` 및 저장소 정책에 따라 |

```text
Browser → Next.js Server → Backend API / DB
   │          │
 Router     Request Memoization / Data Cache
 Cache      Full Route Cache / use cache
```

**브라우저가 Next.js 서버에 요청하는 것과 Next.js가 Backend API에 요청하는 것은 다르다.** Data Cache가 있어도 첫 번째 요청은 발생할 수 있다.

### 버전별 기본 정책

| 정책 | v14 | v15 | v16 |
|---|---|---|---|
| 서버 GET fetch 중복 제거 | 자동 | 자동 | 자동 |
| 옵션 없는 fetch의 Data Cache | 기본 사용, 예외 있음 | 기본 미사용 | 기본 미사용 |
| GET Route Handler 결과 | 조건부 기본 캐싱 | 기본 미캐싱 | 기본 미캐싱 |
| Router Cache의 Page Segment | 기본 재사용 | 일반 이동에서 기본 재사용 안 함 | v15와 유사, 모델별 차이 |
| `use cache` | 미지원 | 실험적/Canary | 정식 |
| Cache Components | 미지원 | 관련 실험 기능 | `cacheComponents: true`로 활성화 |

v14의 기본 fetch 캐싱은 동적 API나 라우트 설정에 따라 달라진다. v15/v16에서도 정적 페이지는 빌드 시 렌더링한 결과를 재사용할 수 있다. 뒤로/앞으로 이동, Layout 및 prefetch는 Router Cache의 별도 규칙을 따른다.

v16은 **기존 모델**과 **Cache Components 모델**을 구분해야 한다. 이후 `*` 표시가 있는 Route Segment 설정은 Cache Components가 꺼진 경우에만 사용한다.

## 2. 캐싱하는 방법

### 2.1 fetch 자동 Request Memoization — v14~16

```tsx
async function getProducts() {
  const res = await fetch('https://api.example.com/products');
  return res.json();
}

// 같은 서버 렌더링 안에서
await getProducts(); // 실제 요청 또는 Data Cache 조회
await getProducts(); // 동일 fetch 결과 재사용
```

새로운 서버 렌더링에서는 Memoization이 초기화된다. `force-cache`가 없어도 작동하며 `no-store`도 이를 끄지 않는다.

**언제?** Layout과 Page 등 여러 Server Component가 같은 GET 요청을 할 때. 동일 URL과 요청 옵션을 기준으로 하며, 브라우저에서 실행하는 fetch, POST, Route Handler에는 이 React 렌더링 범위의 자동 중복 제거가 적용되지 않는다.

### 2.2 React cache() — v14~16

```tsx
import { cache } from 'react';

export const getUser = cache(async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
});

// 같은 서버 렌더링
await getUser('1'); // DB Query
await getUser('1'); // 재사용
await getUser('2'); // 다른 인자 → DB Query
```

**언제?** Axios, Prisma, TypeORM, Mongoose, 일반 계산 함수의 중복 실행을 한 번의 서버 렌더링 안에서 방지할 때. 같은 cached 함수 인스턴스를 공유해야 한다. 객체 인자는 참조 동일성의 영향을 받으므로 단순한 ID를 전달하면 이해하기 쉽다.

### 2.3 fetch + force-cache — v14~16

```tsx
const res = await fetch(url, { cache: 'force-cache' });
```

**언제?** 국가 목록, 상품 카테고리 등 변경 빈도가 낮은 공통 API 데이터. 이후 서버 요청에서도 캐시가 유효하면 재사용한다. 시간 기반 재검증을 지정하지 않아도 저장소 퇴거나 명시적 무효화가 가능하다.

### 2.4 fetch + revalidate — v14~16

```tsx
const res = await fetch(url, { next: { revalidate: 60 } });
```

```text
0초  → 조회 및 저장
30초 → 재사용
70초 → 기존 결과 반환 가능 + 백그라운드 갱신
이후 → 갱신된 결과 재사용
```

**언제?** 뉴스, 상품 목록 등 일정 시간 오래된 데이터가 허용되는 경우. 60초마다 실행되는 타이머가 아니다. `revalidate: false`는 시간 기반 재검증을 하지 않는 정책이다.

### 2.5 unstable_cache() — v14~16 (기존 모델 중심)

```tsx
import { unstable_cache } from 'next/cache';

export const getProducts = unstable_cache(
  async () => prisma.product.findMany(),
  ['products'],
  { revalidate: 60, tags: ['products'] }
);
```

**언제?** fetch가 아닌 DB Query, Axios, 계산 결과를 여러 서버 요청에 걸쳐 재사용할 때. v16 Cache Components에서는 `use cache`를 우선 고려한다. 함수 인자와 추가 keyParts로 캐시를 구분하고 요청별 cookies/headers는 바깥에서 읽어 필요한 값을 전달한다.

### 2.6 정적 페이지와 ISR — v14~16*

```tsx
// app/about/page.tsx — 자동 정적 렌더링 가능
export default function Page() {
  return <h1>About us</h1>;
}
```

```tsx
// app/products/page.tsx — 기존 모델의 ISR
export const revalidate = 60;
```

`dynamic = 'force-static'`은 정적 렌더링을 강제한다. 동적 경로는 `generateStaticParams()`로 미리 생성할 수 있다.

```tsx
export async function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }];
}
```

**언제?** FAQ, 블로그, 공개 상품 상세 등 렌더링된 페이지 결과도 재사용하고 싶을 때. `generateStaticParams` 자체가 모든 데이터 캐싱을 보장하는 것은 아니다.

### 2.7 라우트의 fetch 정책 — v14~16*

```tsx
export const fetchCache = 'force-cache';
```

| 옵션 | 역할 |
|---|---|
| `auto` | 프레임워크 기본 정책 |
| `default-cache` | 옵션 없는 fetch 캐싱 |
| `only-cache` | no-store 요청을 제한 |
| `force-cache` | fetch 캐싱 강제 |
| `default-no-store` | 옵션 없는 fetch 미캐싱 |
| `only-no-store` | force-cache 요청을 제한 |
| `force-no-store` | fetch 미캐싱 강제 |

**언제?** 같은 라우트에 공통 정책이 필요한 경우. 일반적으로 개별 데이터 함수에서 정책을 명시하면 더 이해하기 쉽다.

### 2.8 Router Cache / Prefetch — v14~16

```tsx
<Link href="/products" prefetch={true}>Products</Link>
```

```tsx
'use client';
import { useRouter } from 'next/navigation';

export default function Menu() {
  const router = useRouter();
  return <button onMouseEnter={() => router.prefetch('/products')}
    onClick={() => router.push('/products')}>Products</button>;
}
```

**언제?** 페이지 이동 속도를 높이고 싶을 때. API 응답 캐시와 다르다. 기존 모델의 `experimental.staleTimes`(v14.2부터)는 Page Segment 재사용 시간을 조절할 수 있다. 예: `{ dynamic: 30, static: 180 }` (초). Cache Components의 client stale 정책과 구분한다.

## 3. v16의 use cache

### 3.1 활성화

```tsx
// next.config.ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { cacheComponents: true };
export default nextConfig;
```

`use cache`는 fetch 전용이 아니다. 비동기 서버 함수나 Server Component의 **반환 결과**를 캐싱한다. 인자와 반환값은 지원되는 직렬화 규칙을 충족해야 한다.

### 3.2 함수 수준 — API, DB, Axios, 계산

```tsx
async function getProducts() {
  'use cache';
  const res = await fetch(url);
  return res.json();
}

async function getUsers() {
  'use cache';
  return prisma.user.findMany();
}

async function getPrices() {
  'use cache';
  return (await axios.get(url)).data;
}

async function sum(numbers: number[]) {
  'use cache';
  return numbers.reduce((a, b) => a + b, 0);
}
```

**언제?** 데이터 또는 계산 결과를 여러 서버 요청에서 재사용할 때. 단순한 덧셈은 개념 설명용이며 실제로는 캐싱 비용보다 계산 비용이 훨씬 큰 경우에 활용한다.

### 3.3 컴포넌트, 페이지, 파일 수준

```tsx
async function ProductList() {
  'use cache';
  const products = await prisma.product.findMany();
  return <p>Total: {products.length}</p>;
}
```

```tsx
// app/products/page.tsx
export default async function Page() {
  'use cache';
  return <ProductList />;
}
```

```tsx
// lib/catalog.ts
'use cache';
export async function getProducts() {
  return prisma.product.findMany();
}
export async function getCategories() {
  return prisma.category.findMany();
}
```

| 위치 | 언제? |
|---|---|
| 함수 | 데이터만 캐싱 |
| 컴포넌트 | 공통 UI 일부 캐싱 |
| 페이지 | 공개 페이지 컴포넌트 결과 캐싱 |
| 파일 | export하는 비동기 함수들에 일관된 정책 적용 |

페이지 수준 캐시가 반드시 모든 하위 동적 콘텐츠까지 캐싱한다는 뜻은 아니다. 지원되는 children 전달 및 Suspense 경계로 동적 부분을 분리할 수 있다.

### 3.4 React cache() vs unstable_cache() vs use cache

| 비교 | React `cache()` | `unstable_cache()` | `'use cache'` |
|---|---|---|---|
| 대상 | 함수 결과 | 함수 결과 | 함수/컴포넌트 결과 |
| 여러 서버 요청 간 재사용 | 아니오 | 가능 | 가능 |
| 시간 정책 | 없음 | revalidate | cacheLife |
| Tag | 없음 | tags | cacheTag |
| 버전 | 14~16 | 14~16 | 15 실험적, 16 정식 |

```text
React cache(): 이번 서버 렌더링에서 기억
use cache:     다음 서버 렌더링에서도 기억 가능
```

따라서 `use cache`는 목적상 `unstable_cache()`에 더 가깝다. 실제 재사용은 캐시 키, 수명, 서버 인스턴스와 저장소에 따라 달라진다.

### 3.5 cacheLife와 cacheTag

```tsx
import { cacheLife, cacheTag } from 'next/cache';

export async function getProducts() {
  'use cache';
  cacheLife('minutes');
  cacheTag('products');
  return prisma.product.findMany();
}
```

- `use cache`: 무엇을 캐싱할까?
- `cacheLife`: 얼마나 오래 재사용할까?
- `cacheTag`: 어떤 이름으로 관리할까?

Profile: `default`, `seconds`, `minutes`, `hours`, `days`, `weeks`, `max`. 이름이 정확한 만료 초를 의미하지는 않는다.

```tsx
cacheLife({ stale: 30, revalidate: 60, expire: 300 });
```

| 옵션 (초) | 의미 |
|---|---|
| stale | 클라이언트가 서버 확인 없이 재사용할 시간 |
| revalidate | 서버 백그라운드 갱신 가능 시점 |
| expire | 오래된 결과 대신 새 결과를 기다리는 만료 기준 |

### 3.6 use cache: remote / private

```tsx
async function getCatalog() {
  'use cache: remote';
  return prisma.product.findMany();
}
```

**remote:** 서버 여러 대가 캐시를 공유해야 할 때. 외부 캐시 핸들러 또는 호스팅 지원이 필요하다. 선언만으로 Redis가 설치되지 않으며 핸들러 미설정 시 기본적으로 메모리 캐시를 사용한다.

```tsx
import { cookies } from 'next/headers';
import { cacheLife } from 'next/cache';

async function getPreference() {
  'use cache: private';
  cacheLife({ stale: 60 });
  return (await cookies()).get('preference')?.value;
}
```

**private:** v16 실험적 기능. 요청별 API에 접근 가능하며 결과를 서버 공유 캐시에 저장하지 않고 브라우저 메모리에 저장한다. 새로고침 이후 유지되지 않는다. Production 도입은 신중해야 한다.

일반 `use cache`는 cookies/headers를 직접 읽지 않는다. 밖에서 읽은 값으로 캐시 키를 분리할 수 있지만, 사용자 권한과 민감한 데이터는 별도로 검증해야 한다. DB 등록·수정·삭제 등 부수 효과가 있는 작업을 캐싱하지 않는다.

### 3.7 쉬운 실전 예제: 상품 페이지

```tsx
import { Suspense } from 'react';
import { cacheLife, cacheTag } from 'next/cache';

async function Categories() {
  'use cache';
  cacheLife('days');
  const rows = await prisma.category.findMany();
  return <p>Categories: {rows.length}</p>;
}

async function Products() {
  'use cache';
  cacheLife('minutes');
  cacheTag('products');
  const rows = await prisma.product.findMany();
  return <p>Products: {rows.length}</p>;
}

async function Inventory() {
  const res = await fetch('https://api.example.com/inventory', {
    cache: 'no-store',
  });
  const data = await res.json();
  return <p>Stock: {data.stock}</p>;
}

export default function Page() {
  return <main>
    <Categories />
    <Products />
    <Suspense fallback={<p>Loading stock...</p>}>
      <Inventory />
    </Suspense>
  </main>;
}
```

카테고리는 오래, 상품 목록은 짧게 캐싱하고 재고는 요청 시 가져온다. Suspense는 캐시 기능이 아니라 동적 부분의 로딩을 분리하는 기능이다.

## 4. 캐시를 사용하지 않는 방법

**Opt-out:** 처음부터 캐시를 사용하지 않는다. 기존 저장 항목을 물리적으로 삭제한다는 의미는 아니다.

### 4.1 fetch Data Cache 비활성화 — v14~16

```tsx
await fetch(url, { cache: 'no-store' });
// 또는
await fetch(url, { next: { revalidate: 0 } });
```

**언제?** 실시간 가격, 주문 상태, 재고 등. 두 옵션을 동시에 쓸 필요는 없다. Request Memoization은 별도로 작동한다.

### 4.2 Request Memoization까지 우회 — v14~16

```tsx
await fetch(url, {
  cache: 'no-store',
  signal: new AbortController().signal,
});
```

`signal`은 fetch의 자동 중복 제거를 우회하는 방법이다. `no-store`는 Data Cache를 우회한다. 각 호출이 독립적으로 실행되어야 하는 특별한 경우에 사용한다.

### 4.3 일반 함수 캐싱 제거

```tsx
// 기존: cache(async () => ...), unstable_cache(async () => ...)
// 또는 함수 내부의 'use cache'
// 변경:
export async function getProducts() {
  return prisma.product.findMany();
}
```

상위 파일이나 컴포넌트에도 `use cache`가 있는지 확인한다. 다음 코드는 내부 HTTP 요청은 미캐싱이어도 외부 함수 결과가 캐싱된다.

```tsx
async function getProducts() {
  'use cache';
  return (await fetch(url, { cache: 'no-store' })).json();
}
```

### 4.4 라우트 수준 비활성화 — v14~16*

| 설정 | 역할 |
|---|---|
| `export const dynamic = 'force-dynamic'` | 요청 시 렌더링, fetch 미캐싱 강제 |
| `export const fetchCache = 'force-no-store'` | 라우트 fetch 캐싱 방지 |
| `export const revalidate = 0` | 동적 렌더링, 명시적 force-cache는 유지 가능 |

일반 함수의 별도 캐시까지 무효화하지 않는다. Cache Components가 활성화된 v16에서는 위 Route Segment 설정 대신 캐싱 범위와 동적 렌더링을 직접 지정한다.

### 4.5 정적 렌더링만 방지

```tsx
// v14 (v15 이후 deprecated)
import { unstable_noStore as noStore } from 'next/cache';
noStore();
```

```tsx
// v15, v16
import { connection } from 'next/server';
await connection();
const now = new Date();
```

**언제?** 빌드 시점이 아닌 실제 사용자 요청 시 코드가 실행되어야 할 때. connection은 명시적으로 캐싱된 데이터의 삭제 API가 아니다. Cache Components에서는 필요한 동적 부분을 Suspense로 분리한다.

## 5. 기존 캐시를 갱신하는 방법

**Invalidation:** 데이터를 수정한 후 이전 캐시가 계속 사용되지 않도록 한다. **Refresh:** 브라우저가 서버에 화면 데이터를 다시 요청한다. 서로 다른 기능이다.

### 5.1 revalidatePath — v14~16

```tsx
'use server';
import { revalidatePath } from 'next/cache';

export async function addProduct(name: string) {
  // 실제 서비스에서는 인증·권한·입력 검증 필요
  await prisma.product.create({ data: { name } });
  revalidatePath('/products');
}
```

**언제?** 특정 페이지를 갱신할 때. Server Action에서는 현재 화면 갱신 가능, Route Handler에서는 다음 방문 때 재검증하도록 표시한다.

```tsx
revalidatePath('/products/123');
revalidatePath('/products/[id]', 'page');
revalidatePath('/products', 'layout');
revalidatePath('/', 'layout'); // Root Layout 및 하위 경로
```

다른 경로에서도 공유하는 tagged 데이터는 별도 Tag 무효화가 필요할 수 있다.

### 5.2 revalidateTag — v14~16

먼저 데이터를 캐싱할 때 Tag를 설정한다.

```tsx
await fetch(url, { cache: 'force-cache', next: { tags: ['products'] } });
// unstable_cache의 옵션: { tags: ['products'] }
// use cache 내부: cacheTag('products')
```

```tsx
// v14, v15
revalidateTag('products');
// v16 권장
revalidateTag('products', 'max');
```

**언제?** 상품 목록과 Dashboard처럼 여러 페이지가 동일한 데이터를 사용할 때. v16의 `max`는 오래된 결과를 잠시 반환하면서 백그라운드 갱신하는 SWR 방식이다. 단일 인자 방식은 v16에서 deprecated이며 다음 조회가 최신 결과를 기다리는 방식이다.

### 5.3 updateTag — v16

```tsx
'use server';
import { updateTag } from 'next/cache';

export async function addProduct(name: string) {
  // 실제 서비스에서는 인증·권한·입력 검증 필요
  await prisma.product.create({ data: { name } });
  updateTag('products');
}
```

**언제?** 등록한 상품이나 댓글을 사용자가 즉시 확인해야 할 때. 캐시를 즉시 만료시키며 다음 조회가 새 결과를 기다린다. Server Action 전용이다.

### 5.4 외부 Webhook에서 즉시 만료 — v16

```tsx
// 인증 및 서명 검증이 완료된 Route Handler 내부
revalidateTag('products', { expire: 0 });
```

**언제?** 외부 CMS나 API에서 변경을 통보받았을 때. 공개된 무인증 캐시 무효화 엔드포인트를 만들지 않는다.

| 방법 | 기준 | 동작 | 실행 위치 |
|---|---|---|---|
| revalidatePath | 경로 | 관련 캐시 재검증 | Server Action / Route Handler |
| revalidateTag(tag) | Tag | 다음 조회 갱신 (v16 deprecated) | 둘 다 |
| revalidateTag(tag, 'max') | Tag | 기존 결과 허용, 백그라운드 갱신 | 둘 다 (v16) |
| updateTag | Tag | 즉시 만료 | Server Action (v16) |
| revalidateTag(tag, { expire: 0 }) | Tag | 즉시 만료 | 둘 다 (v16) |

시간에 따른 갱신은 `next.revalidate` 또는 `cacheLife`를 사용한다 (2.4, 3.5 참고).

### 5.5 Client Router Cache 갱신 및 최소화

```tsx
'use client';
import { useRouter } from 'next/navigation';
export default function RefreshButton() {
  const router = useRouter();
  return <button onClick={() => router.refresh()}>Refresh</button>;
}
```

v14~16의 `router.refresh()`는 화면 데이터를 다시 요청하지만 서버 Data Cache를 삭제하지 않는다. v16의 Server Action에서는 `import { refresh } from 'next/cache'; refresh();`로 Router를 갱신할 수 있다.

`<Link prefetch={false}>`는 사전 요청만 방지한다. 기존 모델의 `experimental.staleTimes: { dynamic: 0, static: 0 }`는 페이지 캐시 재사용을 최소화하지만 Layout 및 뒤로/앞으로 가기까지 완전히 끄지는 않는다. 브라우저 새로고침은 브라우저 메모리 Router Cache를 초기화하지만 서버 캐시는 유지될 수 있다. Server Action에서 cookies의 set/delete도 Router Cache 무효화를 유도한다.

## 6. 실제 테스트와 주의사항

### 6.1 동일한 두 fetch 중 하나만 force-cache를 적용한다면?

```tsx
// A
await fetch(url, { cache: 'force-cache' });
// B
await fetch(url);
```

v15/v16에서 B에는 명시적인 Data Cache 정책이 없다. A의 캐시 정책이 B까지 자동 전파된다고 가정하면 안 된다. 페이지를 떠났다가 돌아왔을 때 Backend API 요청이 다시 발생할 수 있다. 같은 렌더링에서의 중복 제거, 호출 순서, 정적 렌더링 등도 영향을 줄 수 있으므로 실제 로그 없이 정확한 원인을 확정할 수 없다.

권장: 공통 데이터 함수를 만든다.

```tsx
export async function getProducts() {
  const res = await fetch(url, { cache: 'force-cache' });
  return res.json();
}
```

두 컴포넌트에서 `getProducts()`를 사용하면 정책을 일관되게 유지할 수 있다.

### 6.2 Production 모드로 테스트

```bash
pnpm build
pnpm start
```

Backend API 로그에서 실제 HTTP 호출 횟수를 확인한다. Next.js 서버 로그만으로는 Data Cache HIT 여부를 확정할 수 없다. 동일 렌더링 두 번 호출, 다른 페이지 이동 후 복귀, 브라우저 새로고침을 각각 비교한다.

### 6.3 개발 환경 캐시 초기화

서버를 종료한 후 프로젝트 루트에서:

```bash
rm -rf .next
pnpm dev
```

로컬 빌드 결과와 해당 저장소의 캐시를 제거한다. 외부 Redis, 별도 Cache Handler, CDN 캐시는 제거되지 않는다. v15/v16의 개발 HMR 캐시를 끄려면:

```tsx
const nextConfig = {
  experimental: { serverComponentsHmrCache: false },
};
export default nextConfig;
```

개발 모드의 HMR, 브라우저 강제 새로고침과 Production 동작은 다를 수 있다.

## 7. 상황별 선택표

| 상황 | v14 / v15 | v16 |
|---|---|---|
| 동일 API 중복 실행 방지 | 자동 fetch Memoization | 동일 |
| 동일 DB Query 중복 방지 | React cache() | 동일 |
| 공통 API 응답 재사용 | force-cache | force-cache / use cache |
| API 시간 기반 갱신 | next.revalidate | next.revalidate / cacheLife |
| DB/Axios/계산 결과 재사용 | unstable_cache | use cache 권장 (Cache Components) |
| 공통 컴포넌트 결과 캐싱 | 정적 렌더링 중심 | use cache |
| 외부 공유 캐시 | Custom Cache Handler | use cache: remote + Handler |
| 개인화 브라우저 캐시 | 별도 구현 | use cache: private (실험적) |
| 실시간 API 조회 | no-store | no-store + 상위 캐시 확인 |
| 요청 시점 렌더링 | noStore(v14) / connection(v15) | connection / 동적 Suspense 영역 |
| 특정 경로 갱신 | revalidatePath | 동일 |
| 공통 데이터 갱신 | revalidateTag(tag) | revalidateTag(tag, 'max') |
| CRUD 직후 즉시 반영 | revalidateTag / revalidatePath | updateTag |
| 화면만 다시 요청 | router.refresh | router.refresh / refresh |

**암기:** `cache()` = 이번 요청에서 기억. `use cache` = 다음 요청에도 기억 가능. `no-store` = fetch 캐싱하지 않기. `revalidatePath` = 경로 갱신. `revalidateTag` = 데이터 그룹 갱신. `updateTag` = 즉시 만료. `router.refresh` = 화면 다시 요청.

## 8. 공식 문서

- [v14 Caching](https://nextjs.org/docs/14/app/building-your-application/caching)
- [v15 Caching](https://nextjs.org/docs/15/app/guides/caching)
- [v15 Upgrade](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [v16 Caching — Previous Model](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [fetch](https://nextjs.org/docs/app/api-reference/functions/fetch)
- [use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [use cache: remote](https://nextjs.org/docs/app/api-reference/directives/use-cache-remote)
- [use cache: private](https://nextjs.org/docs/app/api-reference/directives/use-cache-private)
- [cacheHandlers](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheHandlers)
- [cacheLife](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
- [Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components)
- [Revalidating](https://nextjs.org/docs/app/getting-started/revalidating)
- [revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag)
- [React cache](https://react.dev/reference/react/cache)

범위: App Router 내장 캐싱. Pages Router, 브라우저 HTTP Cache, CDN 및 SWR/TanStack Query 등 외부 라이브러리는 제외한다. 공식 문서와 기존 학습 내용을 바탕으로 정리했으며 버전별 실제 프로젝트 실행 테스트는 수행하지 않았다.
