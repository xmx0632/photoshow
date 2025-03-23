-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  tag TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建图片-标签关联表
CREATE TABLE IF NOT EXISTS image_tags (
  id SERIAL PRIMARY KEY,
  image_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(image_id, tag_id)
);

-- 创建图片元数据表
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  url TEXT,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_image_tags_image_id ON image_tags(image_id);
CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON image_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);

-- 创建函数：获取图片的所有标签
CREATE OR REPLACE FUNCTION get_image_tags(image_id_param TEXT)
RETURNS TABLE (tag TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.tag
  FROM tags t
  JOIN image_tags it ON t.id = it.tag_id
  WHERE it.image_id = image_id_param
  ORDER BY t.tag;
END;
$$ LANGUAGE plpgsql;
