export const fetchCache = 'default-no-store'

export default async function FruitsPage() {
  const response = await fetch('https://demo.playwright.dev/api-mocking/api/v1/fruits?1');
  const fruits = await response.json() as any[];
  console.log('doing the server side request')

  return (
    <div>
      <ul id="fruits">
        {fruits.map((fruit) => (
          <li key={fruit.id}>{fruit.name}</li>
        ))}
      </ul>
    </div>
  );
}