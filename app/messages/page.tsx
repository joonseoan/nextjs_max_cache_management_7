// TODO: re-organize cache and uncache in terms of
// Request memoization, Data cache, Full route cache, Router Cache


// Activate no caching.
import { unstable_noStore } from 'next/cache';
import Messages from '@/components/messages';
import { cacheLife } from 'next/cache';
import { Suspense } from 'react';
import { connection } from 'next/server';

// [Deprecated]
// It only for v14 and v15
// File wide cache setup
// `5` seconds caching for this file.
// It muse use `export` and `revalidate` variable name.
// Instead, we need to implement 'use cache'
// export const revalidate = 5;

// [Deprecated]
// activate no caching
// It is default in v16.
// So without `use cache`, it is dynamic.
// export const dynamic = 'force-dynamic';  --> same role of `unstable_noStore`

async function Message() {
  // [IMPORTANT!!!]
  // Deactivate [Full Route Cache]
  // 1) connection() 이후의 코드는 빌드 시점의 prerendering 대상에서 제외되고,
  // 실제 서버 요청 시점에 실행됩니다.
  // await connection();
  // 2) revalidate() hook before redirect.


  // [IMPORTANT]
  // Component-based caching with `revalidate`
  // 'use cache';
  // [IMPORTANT]
  // Deactivate data cache
  // cacheLife({ revalidate: 5 });

  // [Deprecated in v16]
  // activate `dynamic`
  // unstable_noStore();

  // [IMPORTANT]
  // [Request Memoization]
  // Two components `layout.tsx` and `page.tsx`
  // have the same `fetch` function here but it looks violating `REQUEST MEMOIZATION`
  // mentioned in `page.tsx` in root.

  // So two same requests to the server run at the same time
  // in loading the  `/messages` page here.
  // This is exactly what should be avoided. This mechanism is only active
  // if these two requests are sent with exactly the same configuration.
  // Now these have the different configuration
  // headers: {'X-ID': 'page' | 'layout'}
  const response = await fetch('http://localhost:8080/messages', {
    // Once we remove `headers` which has the different property values
    // in the fetch functions of page.tsx and layout.tsx,
    // we will have only one request! (v16 and v14. not v15 -> still two requests)

    // Then the response data will be used in entire pages or components.
    // headers: {
    //   'X-ID': 'page',
    // },

    // [IMPORTANT]
    // [Data Caching]
    // 1) Need to implement `cache` attribute here for `fetch` function
    //    . With `cache` property.
    //    . With `next` property.
    // 2) On the other hand, the functions other than `fetch`, we can use `cache` function
    // from React.
    // 3) For the DB Query or the function, we can also use `unstable_cache()`
    // 4) For the function, component, and page, we can implement `use cache`
    
    
    // [IMPORTANT]
    // [Full Router Cache]
    // 5) Generating `static` page / ISR
    // 6) Generating RSC payload (by default)

    // (Examples)
    cache: 'force-cache',
    // next: {
    //   // no caching
    //   // revalidate: false,

    //   // caching 10 seconds and then throwing out the cached data.
    //   revalidate: 10,
    // }
  });

  const messages = await response.json();

  if (!messages || messages.length === 0) {
    return <p>No messages found</p>;
  }

  return <Messages messages={messages} />;
}

export default async function MessagesPage() {
  return <Suspense fallback={<p>Message is loading...</p>}>
    <Message />
  </Suspense>;
}
