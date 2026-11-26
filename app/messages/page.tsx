import Messages from '@/components/messages';
import { Suspense } from 'react';

async function Message() {
  // [ISSUE]
  // Two components `layout.tsx` and `page.tsx`
  // have the same fetch function here but it looks violating `REQUEST MEMOIZATION`
  // mentioned in `page.tsx` in root.
  // So two same requests to the server run at the same time
  // in loading the  `/messages` page here.
  // This is exactly what should be avoided. This mechanism is only active
  // if these two requests are sent with exactly the same configuration.
  // Now these have the different configuration
  // headers: {'X-ID': 'page' | 'layout'}
  const response = await fetch('http://localhost:8080/messages', {
    // Once we remove `headers` which is different elements 
    // in the fetch functions of page.tsx and layout.tsx,
    // we will have only one request!
    // Then the response data will be used in entire pages or components.
    // headers: {
    //   'X-ID': 'page',
    // },
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
