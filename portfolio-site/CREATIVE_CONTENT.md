# Creative Library media posts

The portfolio already includes direct links to the verified Instagram, YouTube, Medium, and LinkedIn profiles.

To feature individual videos in the same cinematic card design, add a public video URL to `creative-posts.json`. No API token or backend is required. The site displays only the entries in that file.

Example (replace with a real public post; the sample URL is NOT currently published):
```json
{
  "items": [
    {
      "provider": "youtube",
      "url": "https://www.youtube.com/watch?v=REPLACE_WITH_REAL_VIDEO_ID",
      "title": "Your actual video title",
      "description": "A short description",
      "category": "video",
      "creator": "Ronin Simplify Talks"
    }
  ]
}
```

Supported providers: `youtube`, `instagram`, `tiktok`, `vimeo`. Supported category filters: `video`, `music`, `dance`, `writing`.

For Instagram, use a public individual Reel or post URL (`https://www.instagram.com/reel/POST_ID/`). Profiles alone can't be embedded as individual Reels. For YouTube, use a watch URL or Shorts URL. Click-to-play embeds defer third-party network requests until someone chooses to watch.

Notes: The manifest is kept intentionally empty until a post is verified. All existing profile and channel links remain functional without JavaScript. Private posts and creator-account embedding restrictions may prevent inline playback, so each individual card also retains an Open Original link.
