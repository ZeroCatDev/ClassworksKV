<script setup>
import { ref, computed } from "vue";
import { marked } from "marked";
import axios from "@/lib/axios";
import Card from "./ui/card/Card.vue";
import CardHeader from "./ui/card/CardHeader.vue";
import CardTitle from "./ui/card/CardTitle.vue";
import CardDescription from "./ui/card/CardDescription.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ExternalLink } from "lucide-vue-next";
import { cn } from "@/lib/utils";

const props = defineProps({
  appId: {
    type: Number,
    required: true,
  },
  class: {
    type: null,
    required: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const app = ref(null);
const readme = ref("");
const loading = ref(true);
const error = ref(null);
const showDialog = ref(false);

// 从环境变量获取 assets URL
const assetsBaseUrl = import.meta.env.VITE_ASSETS_URL || "";

// 根据 iconHash 生成图片 URL
const iconUrl = computed(() => {
  if (!app.value?.iconHash) return null;
  const hash = app.value.iconHash;
  if (hash.length < 4) return null;

  const folder1 = hash.substring(0, 2);
  const folder2 = hash.substring(2, 4);

  return `${assetsBaseUrl}/${folder1}/${folder2}/${hash}.webp`;
});

// 渲染 Markdown 为 HTML
const renderedReadme = computed(() => {
  if (!readme.value) return "";
  return marked(readme.value);
});

// 获取应用信息
const fetchApp = async () => {
  try {
    app.value = await axios.get(`/apps/${props.appId}`);

    if (app.value.repositoryUrl) {
      await fetchReadme();
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

// 检测 Git 平台并获取 README
const fetchReadme = async () => {
  if (!app.value?.repositoryUrl) return;

  const url = app.value.repositoryUrl;
  let readmeUrl = null;

  try {
    // GitHub
    if (url.includes("github.com")) {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
      if (match) {
        const [, owner, repo] = match;
        readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
        // 尝试 main，失败则尝试 master
        let response = await fetch(readmeUrl);
        if (!response.ok) {
          readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`;
          response = await fetch(readmeUrl);
        }
        if (response.ok) {
          readme.value = await response.text();
          return;
        }
      }
    }

    // GitLab
    if (url.includes("gitlab.com")) {
      const match = url.match(/gitlab\.com\/([^\/]+\/[^\/]+?)(?:\.git)?$/);
      if (match) {
        const [, path] = match;
        readmeUrl = `https://gitlab.com/${path}/-/raw/main/README.md`;
        let response = await fetch(readmeUrl);
        if (!response.ok) {
          readmeUrl = `https://gitlab.com/${path}/-/raw/master/README.md`;
          response = await fetch(readmeUrl);
        }
        if (response.ok) {
          readme.value = await response.text();
          return;
        }
      }
    }

    // Bitbucket
    if (url.includes("bitbucket.org")) {
      const match = url.match(/bitbucket\.org\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
      if (match) {
        const [, owner, repo] = match;
        readmeUrl = `https://bitbucket.org/${owner}/${repo}/raw/main/README.md`;
        let response = await fetch(readmeUrl);
        if (!response.ok) {
          readmeUrl = `https://bitbucket.org/${owner}/${repo}/raw/master/README.md`;
          response = await fetch(readmeUrl);
        }
        if (response.ok) {
          readme.value = await response.text();
          return;
        }
      }
    }

    // Gitea/Forgejo 或通用处理
    const genericMatch = url.match(
      /https?:\/\/([^\/]+)\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
    );
    if (genericMatch) {
      const [, domain, owner, repo] = genericMatch;
      // 尝试 Gitea/Forgejo 格式
      readmeUrl = `https://${domain}/${owner}/${repo}/raw/branch/main/README.md`;
      let response = await fetch(readmeUrl);
      if (!response.ok) {
        readmeUrl = `https://${domain}/${owner}/${repo}/raw/branch/master/README.md`;
        response = await fetch(readmeUrl);
      }
      if (response.ok) {
        readme.value = await response.text();
        return;
      }
    }

    // 最后尝试直接请求原地址
    const directResponse = await fetch(url);
    if (directResponse.ok) {
      readme.value = await directResponse.text();
    }
  } catch (err) {
    console.warn("Failed to fetch README:", err);
  }
};

// 组件挂载时获取数据
fetchApp();
</script>

<template>
  <!-- 卡片视图 -->
  <Card
    :class="
      cn(
        'app-card cursor-pointer hover:shadow-lg transition-shadow',
        props.class
      )
    "
    @click="showDialog = true"
  >
    <CardHeader v-if="loading" class="px-6">
      <div class="animate-pulse">加载中...</div>
    </CardHeader>

    <template v-else-if="error">
      <CardHeader class="px-6">
        <CardTitle class="text-red-500">错误</CardTitle>
        <CardDescription>{{ error }}</CardDescription>
      </CardHeader>
    </template>

    <template v-else-if="app">
      <CardHeader class="px-6">
        <div class="flex items-start gap-4">
          <img
            v-if="iconUrl"
            :src="iconUrl"
            :alt="app.name"
            class="w-12 h-12 rounded-lg object-cover shrink-0"
            @error="(e) => (e.target.style.display = 'none')"
          />
          <div class="flex-1 min-w-0">
            <CardTitle class="text-lg truncate">{{ app.name }}</CardTitle>
            <CardDescription v-if="app.description" class="line-clamp-2">
              {{ app.description }}
            </CardDescription>
            <div class="mt-2 text-xs text-muted-foreground">
              <span>{{ app.developerName }}</span>
            </div>
          </div>
        </div>
      </CardHeader>
    </template>
  </Card>

  <!-- 详情对话框 -->
  <Dialog v-model:open="showDialog">
    <DialogContent class="max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader v-if="app">
        <div class="flex items-start gap-4 mb-4">
          <img
            v-if="iconUrl"
            :src="iconUrl"
            :alt="app.name"
            class="w-20 h-20 rounded-lg object-cover"
            @error="(e) => (e.target.style.display = 'none')"
          />
          <div class="flex-1">
            <DialogTitle class="text-2xl mb-2">{{ app.name }}</DialogTitle>
            <DialogDescription v-if="app.description" class="text-base">
              {{ app.description }}
            </DialogDescription>
          </div>
        </div>

        <!-- 应用元信息 -->
        <div class="grid grid-cols-2 gap-4 py-4 border-y">
          <div class="space-y-1">
            <div class="text-sm text-muted-foreground">开发者</div>
            <div class="font-medium">{{ app.developerName }}</div>
          </div>
          <div v-if="app.developerLink" class="space-y-1">
            <div class="text-sm text-muted-foreground">开发者链接</div>
            <a
              :href="app.developerLink"
              target="_blank"
              class="text-primary hover:underline inline-flex items-center gap-1"
            >
              访问
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
          <div v-if="app.homepageLink" class="space-y-1">
            <div class="text-sm text-muted-foreground">应用主页</div>
            <a
              :href="app.homepageLink"
              target="_blank"
              class="text-primary hover:underline inline-flex items-center gap-1"
            >
              访问
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
          <div v-if="app.repositoryUrl" class="space-y-1">
            <div class="text-sm text-muted-foreground">仓库地址</div>
            <a
              :href="app.repositoryUrl"
              target="_blank"
              class="text-primary hover:underline inline-flex items-center gap-1 truncate"
            >
              查看仓库
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
        </div>
      </DialogHeader>

      <!-- README 内容 -->
      <div v-if="readme" class="mt-6">
        <h3 class="text-lg font-semibold mb-4">README</h3>
        <div
          class="prose prose-sm dark:prose-invert max-w-none border rounded-lg p-6 bg-muted/30 prose-headings:font-semibold prose-a:text-primary prose-blockquote:border-l-2 prose-blockquote:pl-4 prose-img:rounded-md prose-table:w-full break-words"
          v-html="renderedReadme"
        ></div>
      </div>
      <div
        v-else-if="!loading && app?.repositoryUrl"
        class="mt-6 text-center text-muted-foreground"
      >
        无法加载 README 文件
      </div>
    </DialogContent>
  </Dialog>
</template>
