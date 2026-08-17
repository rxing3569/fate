<script setup lang="ts">withDefaults(defineProps<{ message?: string; layout?: "fill" | "viewport" }>(), { message: "正在排定乾坤、推演星曜，請稍候…", layout: "fill" });</script>
<template><AppLoading scope="page" :message="message" :layout="layout" :delay="0" /></template>
