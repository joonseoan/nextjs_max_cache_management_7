/*
  4 different areas about NextJS caching.

  1. REQUEST MEMOIZATION
    NextJS stores data requests with the same configuration
    so that duplicates requests are avoided.

    This memoization only happens during one request
    that is being handled on the NextJS server.

    It aims to avoid duplicate requests to a `data source`
    for a single request that is handled by the NextJS server
  
  2. Data Cache
    Data cache is all about storing and reusing data that has been fetched
    from a data source if it has not changed.

    It avoids requests all together unless the data has changed.
    This persists until the data is revalidated by the developer
    or the certain amount of time.

  3. Full Route Cache.
    NextJS stores the entire rendered HTML & React server component payload at buildtime
    which is managed under the hood and which is used to render those pages.

    This therefore does not just avoid the extra round trips to some data source (server and db)
    but it instead entirely avoid the re-rendering of the entire HTML page and hence
    it speeds up pages even further because the existing pages can be reused.

    This cache also persists until the revalidation runs.
    So when the updated data is there, pages also will be re-rendered but only then,
    last but not least there is router cached again.

  4. Router Cache
    The key is that it runs in `client side`, not server side.
    3 cache types above run in the server side.

    NextJS store the React server component payload in memory in the browser.
    And, it does that so that navigation between pages can happen faster.
    Because even with the `full route cache`, NextJS of course would need to send
    a request to the Nextjs server to get that cache.

    Without requesting the page to the NextJS server, the cached page and
    that request to the server can be sped up or
    avoided if the page data is already managed on the client side
    and that is the behind the the `router cache`.
*/

export default function Home() {
  return (
    <>
      <h1>Next.js Caching</h1>
      <p>
        Next.js performs some pretty aggressive caching. Understanding how it
        works therefore is key to avoid issues.
      </p>
    </>
  );
}
