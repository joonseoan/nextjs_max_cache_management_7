import { ReactNode, Suspense } from "react";

async function MessageCount() {
  const response = await fetch('http://localhost:8080/messages', {
    // headers: {
    //   'X-ID': 'layout',
    // },
  });
  const messages = await response.json();
  const totalMessages = messages.length;

  return <p>{totalMessages} messages found</p>;
}

export default async function MessagesLayout(
  { children }: { children: ReactNode },
) {

  return (
    <>
      <h1>Important Messages</h1>
      <Suspense fallback={<p>Message count is loading..</p>}>
        <MessageCount /> 
      </Suspense>
      <hr />
      {children}
    </>
  );
}
