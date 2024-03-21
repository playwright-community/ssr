<script setup lang="ts">
  const { data } = await useFetch<{id: number, name: string}[]>('https://demo.playwright.dev/api-mocking/api/v1/fruits?1', {
    responseType: 'json',
  });
  
</script>

<template>
  <ul id="fruits">
    <li v-for="fruit in data" :key="fruit.id">{{ fruit.name }}</li>
  </ul>
</template>