/**
 * 图片优化工具
 *
 * 功能：
 * 1. 添加 WordPress 图片尺寸参数
 * 2. 支持 WebP 格式
 * 3. 懒加载占位符
 * 4. 响应式图片 srcset
 */

export interface OptimizedImage {
  src: string;
  url?: string; // 兼容 parseACFImage 格式
  srcset?: string;
  webp?: string;
  placeholder?: string;
  width?: number;
  height?: number;
  alt?: string;
}

/**
 * 从 WordPress 图片 URL 获取优化版本
 */
export function optimizeWPImage(
  imageUrl: string,
  size: 'thumbnail' | 'medium' | 'large' | 'full' = 'large',
  options: {
    quality?: number;
    webp?: boolean;
    generateSrcset?: boolean;
  } = {}
): OptimizedImage {
  if (!imageUrl) {
    return {
      src: '',
      placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E'
    };
  }

  const { quality = 80, webp = true, generateSrcset = true } = options;

  // WordPress 图片尺寸映射
  const sizeMap = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 1024, height: 1024 },
    full: { width: null, height: null }
  };

  const dimensions = sizeMap[size];

  // 构建优化后的 URL（添加 WordPress 查询参数）
  const url = new URL(imageUrl);

  // 如果是 WordPress 上传的图片，添加尺寸参数
  if (url.hostname.includes('ebbellejewelry.com') || url.pathname.includes('wp-content/uploads')) {
    // WordPress 支持通过文件名修改获取不同尺寸
    // 例如：image.jpg -> image-300x300.jpg
    let optimizedSrc = imageUrl;

    if (size !== 'full' && dimensions.width) {
      const ext = imageUrl.split('.').pop();
      const baseUrl = imageUrl.substring(0, imageUrl.lastIndexOf('.'));
      optimizedSrc = `${baseUrl}-${dimensions.width}x${dimensions.height}.${ext}`;
    }

    // 生成 srcset 用于响应式加载
    let srcset = undefined;
    if (generateSrcset && size !== 'thumbnail') {
      const ext = imageUrl.split('.').pop();
      const baseUrl = imageUrl.substring(0, imageUrl.lastIndexOf('.'));
      srcset = [
        `${baseUrl}-300x300.${ext} 300w`,
        `${baseUrl}-768x768.${ext} 768w`,
        `${baseUrl}-1024x1024.${ext} 1024w`,
        `${imageUrl} 1920w`
      ].join(', ');
    }

    // WebP 版本（如果 WordPress 支持）
    const webpSrc = webp ? optimizedSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp') : undefined;

    return {
      src: optimizedSrc,
      srcset,
      webp: webpSrc,
      width: dimensions.width || undefined,
      height: dimensions.height || undefined,
      placeholder: generatePlaceholder(dimensions.width || 400, dimensions.height || 300)
    };
  }

  // 非 WordPress 图片，返回原图
  return {
    src: imageUrl,
    width: dimensions.width || undefined,
    height: dimensions.height || undefined
  };
}

/**
 * 生成 SVG 占位符（避免布局偏移）
 */
function generatePlaceholder(width: number, height: number): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Crect fill='%23f0f0f0' width='${width}' height='${height}'/%3E%3C/svg%3E`;
}

/**
 * 优化 ACF 图片对象
 */
export function optimizeACFImage(
  acfImage: any,
  size: 'thumbnail' | 'medium' | 'large' | 'full' = 'large'
): OptimizedImage {
  if (!acfImage || !acfImage.url) {
    return {
      src: '',
      url: '', // 兼容 parseACFImage 返回格式
      alt: '',
      width: 0,
      height: 0,
      placeholder: generatePlaceholder(400, 300)
    };
  }

  // ACF 通常提供多个尺寸
  const sizeUrls = acfImage.sizes || {};
  const selectedUrl = sizeUrls[size] || acfImage.url;

  const optimized = optimizeWPImage(selectedUrl, size, {
    quality: 80,
    webp: true,
    generateSrcset: true
  });

  // 返回兼容 parseACFImage 的格式 + 优化字段
  return {
    ...optimized,
    url: optimized.src, // 添加 url 字段以兼容现有代码
    alt: acfImage.alt || '',
    width: optimized.width || acfImage.width || 0,
    height: optimized.height || acfImage.height || 0
  };
}

/**
 * 批量预加载关键图片（用于 Hero 区域）
 */
export function preloadCriticalImages(images: string[]): string {
  return images
    .filter(Boolean)
    .slice(0, 3) // 只预加载前 3 张
    .map(url => `<link rel="preload" as="image" href="${url}" />`)
    .join('\n');
}
