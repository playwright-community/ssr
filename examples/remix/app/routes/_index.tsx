import type { MetaFunction, TypedResponse } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";

export async function loader(): Promise<TypedResponse<{ id: number, name: string }[]>> {
  const data = await (await fetch('https://demo.playwright.dev/api-mocking/api/v1/fruits', {
    headers: {
      'Authorization': 'Bearer very-secure-token',
    }
  })).json();
  return json(data);
}

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const users = useLoaderData<typeof loader>();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix</h1>
      <ul>
        {users.map(user => <li key={user.id}>{user.name}</li>)}
      </ul>
    </div>
  );
}
