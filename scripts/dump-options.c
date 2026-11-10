/*
 * Dumps what the linked FFmpeg reports at runtime as JSON: the private AVOptions of
 * every codec, filter, bitstream filter, muxer and demuxer (including those of child
 * classes such as framesync), each codec's media type, and the generic AVCodecContext
 * and AVFormatContext options. Built and run by validate-options.js as the ground
 * truth for the generated option typings.
 */
#include <stdio.h>
#include <string.h>

#include <libavcodec/avcodec.h>
#include <libavcodec/bsf.h>
#include <libavdevice/avdevice.h>
#include <libavfilter/avfilter.h>
#include <libavformat/avformat.h>
#include <libavutil/opt.h>

static void json_str(const char *s) {
  putchar('"');
  for (; s && *s; s++) {
    if (*s == '"' || *s == '\\')
      printf("\\%c", *s);
    else if ((unsigned char)*s < 0x20)
      printf("\\u%04x", *s);
    else
      putchar(*s);
  }
  putchar('"');
}

static const char *type_name(int type) {
  switch (type) {
  case AV_OPT_TYPE_FLAGS: return "flags";
  case AV_OPT_TYPE_INT: return "int";
  case AV_OPT_TYPE_INT64: return "int64";
  case AV_OPT_TYPE_UINT: return "uint";
  case AV_OPT_TYPE_UINT64: return "uint64";
  case AV_OPT_TYPE_DOUBLE: return "double";
  case AV_OPT_TYPE_FLOAT: return "float";
  case AV_OPT_TYPE_STRING: return "string";
  case AV_OPT_TYPE_RATIONAL: return "rational";
  case AV_OPT_TYPE_BINARY: return "binary";
  case AV_OPT_TYPE_DICT: return "dict";
  case AV_OPT_TYPE_CONST: return "const";
  case AV_OPT_TYPE_IMAGE_SIZE: return "image_size";
  case AV_OPT_TYPE_PIXEL_FMT: return "pixel_fmt";
  case AV_OPT_TYPE_SAMPLE_FMT: return "sample_fmt";
  case AV_OPT_TYPE_VIDEO_RATE: return "video_rate";
  case AV_OPT_TYPE_DURATION: return "duration";
  case AV_OPT_TYPE_COLOR: return "color";
  case AV_OPT_TYPE_BOOL: return "bool";
  case AV_OPT_TYPE_CHLAYOUT: return "chlayout";
  default: return "unknown";
  }
}

/* The options of one class as "name":{...} members; *first tracks the separator. */
static void dump_options(const AVClass *cls, int child, int *first) {
  const AVClass **obj = &cls;
  const AVOption *o = NULL;
  while ((o = av_opt_next(obj, o))) {
    if (o->type == AV_OPT_TYPE_CONST)
      continue;
    if (!*first)
      putchar(',');
    *first = 0;
    json_str(o->name);
    printf(":{\"child\":%d,\"type\":\"%s\",\"array\":%d,\"consts\":[", child, type_name(o->type & ~AV_OPT_TYPE_FLAG_ARRAY),
           !!(o->type & AV_OPT_TYPE_FLAG_ARRAY));
    if (o->unit) {
      const AVOption *c = NULL;
      int cfirst = 1;
      while ((c = av_opt_next(obj, c))) {
        if (c->type != AV_OPT_TYPE_CONST || !c->unit || strcmp(c->unit, o->unit))
          continue;
        if (!cfirst)
          putchar(',');
        cfirst = 0;
        json_str(c->name);
      }
    }
    printf("]}");
  }
}

/* A class's options plus, with children set, those of its child classes, which
 * component arguments reach through AV_OPT_SEARCH_CHILDREN. */
static void dump_class(const AVClass *cls, int children) {
  int first = 1;
  putchar('{');
  if (cls) {
    dump_options(cls, 0, &first);
    if (children) {
      void *iter = NULL;
      const AVClass *child;
      while ((child = av_opt_child_class_iterate(cls, &iter)))
        dump_options(child, 1, &first);
    }
  }
  putchar('}');
}

/* "name":{"options":{...}} entries of one component kind, iterated by iter_call. */
#define SECTION(label, iter_call, name_expr, class_expr, filter_expr, extra)    \
  do {                                                                          \
    int first = 1;                                                              \
    void *it = NULL;                                                            \
    printf(",\"" label "\":{");                                                 \
    while ((iter_call)) {                                                       \
      if (!(filter_expr))                                                       \
        continue;                                                               \
      if (!first)                                                               \
        putchar(',');                                                           \
      first = 0;                                                                \
      json_str(name_expr);                                                      \
      printf(":{");                                                             \
      extra;                                                                    \
      printf("\"options\":");                                                   \
      dump_class(class_expr, 1);                                                \
      putchar('}');                                                             \
    }                                                                           \
    putchar('}');                                                               \
  } while (0)

int main(void) {
  const AVCodec *c;
  const AVFilter *f;
  const AVBitStreamFilter *b;
  const AVOutputFormat *m;
  const AVInputFormat *d;

  avdevice_register_all();

  /* the generic context classes iterate every component as children: own options only */
  printf("{\"codec_context\":");
  dump_class(avcodec_get_class(), 0);
  printf(",\"format_context\":");
  dump_class(avformat_get_class(), 0);

#define MEDIA printf("\"media\":"), json_str(av_get_media_type_string(c->type)), putchar(',')
  SECTION("encoders", c = av_codec_iterate(&it), c->name, c->priv_class, av_codec_is_encoder(c), MEDIA);
  SECTION("decoders", c = av_codec_iterate(&it), c->name, c->priv_class, av_codec_is_decoder(c), MEDIA);
  SECTION("filters", f = av_filter_iterate(&it), f->name, f->priv_class, 1, (void)0);
  SECTION("bsfs", b = av_bsf_iterate(&it), b->name, b->priv_class, 1, (void)0);
  SECTION("muxers", m = av_muxer_iterate(&it), m->name, m->priv_class, 1, (void)0);
  SECTION("demuxers", d = av_demuxer_iterate(&it), d->name, d->priv_class, 1, (void)0);

  printf("}\n");
  return 0;
}
