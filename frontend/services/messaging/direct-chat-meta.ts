interface DirectChatMetaLike {
  content?: string | null;
  replyToMessageId?: string | null;
  sharedPostId?: string | null;
}

const LEGACY_SHARED_POST_PATH_REGEX = /post-view\/([0-9a-f-]{36})/i;
const LEGACY_SHARED_POST_QUERY_REGEX = /postId=([0-9a-f-]{36})/i;
const LEGACY_REPLY_REGEX = /reply-to:([0-9a-f-]{36})/i;

export function extractLegacySharedPostId(content: string) {
  const pathMatch = content.match(LEGACY_SHARED_POST_PATH_REGEX);
  if (pathMatch) {
    return pathMatch[1];
  }
  const queryMatch = content.match(LEGACY_SHARED_POST_QUERY_REGEX);
  if (queryMatch) {
    return queryMatch[1];
  }
  return null;
}

export function extractLegacyReplyToId(content: string) {
  const match = content.match(LEGACY_REPLY_REGEX);
  return match ? match[1] : null;
}

export function resolveSharedPostId(message: DirectChatMetaLike | null | undefined) {
  if (!message) {
    return null;
  }
  if (message.sharedPostId) {
    return message.sharedPostId;
  }
  return extractLegacySharedPostId(message.content || '');
}

export function resolveReplyToMessageId(
  message: DirectChatMetaLike | null | undefined,
) {
  if (!message) {
    return null;
  }
  if (message.replyToMessageId) {
    return message.replyToMessageId;
  }
  return extractLegacyReplyToId(message.content || '');
}

export function stripSharedPostMarker(
  content: string,
  sharedPostId?: string | null,
) {
  const marker = sharedPostId || extractLegacySharedPostId(content);
  if (!marker) {
    return content.trim();
  }
  return content
    .split('\n')
    .filter(
      (line) =>
        !line.includes(marker) &&
        !line.includes('post-view/') &&
        !line.includes('postId='),
    )
    .join('\n')
    .trim();
}

export function stripReplyMarker(content: string, replyToMessageId?: string | null) {
  const marker = replyToMessageId || extractLegacyReplyToId(content);
  if (!marker) {
    return content
      .split('\n')
      .filter((line) => !line.includes('reply-to:'))
      .join('\n')
      .trim();
  }
  return content
    .split('\n')
    .filter((line) => !line.includes(`reply-to:${marker}`))
    .join('\n')
    .trim();
}

export function stripSystemMarkers(message: DirectChatMetaLike | null | undefined) {
  const content = message?.content || '';
  const withoutShare = stripSharedPostMarker(content, resolveSharedPostId(message));
  return stripReplyMarker(withoutShare, resolveReplyToMessageId(message));
}
