import { redirect } from 'next/navigation';

import { addMessage } from '@/lib/messages';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidate } from '../page';

export default function NewMessagePage() {
  async function createMessage(formData: FormData) {
    'use server';

    const message = formData.get('message')?.toString() || '';
    // addMessage(message);
    // to deactivate `Full route cache`
    // [revalidatePath]
    //  1) revalidate the component or page.
    //     btw, page is default.
    // revalidatePath('/messages');

    // 2) revalidate the component plus it nested components
    // revalidatePath('/messages', 'layout');
    // 3) We can add multiple revalidatePath call in the function.
    // revalidatePath('/messages', 'layout');

    // [revalidateTag]
    // It takes a tag like 'msg' as an input

    // For instance,
    // const response = await fetch('http://localhost:8080/messages', {
      // next: {
        // This tag is going to be registered in the browser.
        //
        // tags: ['messages']
      // }
    // })
    // The NextJS will revalidate and throw away any cached data that has this tag.
    // Please find `response` above.
    revalidateTag('messages')


    redirect('/messages');
  }

  return (
    <>
      <h2>New Message</h2>
      <form action={createMessage}>
        <p className="form-control">
          <label htmlFor="message">Your Message</label>
          <textarea id="message" name="message" required rows={5} />
        </p>

        <p className="form-actions">
          <button type="submit">Send</button>
        </p>
      </form>
    </>
  );
}
