#ifndef FFMPEG_INTERLEAVE_BUDGET_H
#define FFMPEG_INTERLEAVE_BUDGET_H

extern "C" {
#include <libavformat/internal.h>
}

namespace ffmpeg {

// Called under the format-context lock. The estimate is an upper bound: FFmpeg
// can drain packets after a write, but cannot enqueue more than we submitted.
// Recount only when that estimate would exceed the budget, not on every packet.
class InterleaveBudget {
 public:
  bool Admit(AVFormatContext* ctx, const AVPacket* packet, size_t limit) {
    if (!limit || !packet) {
      known_ = false;
      return true;
    }
    size_t incoming = 0;
    if (!AddPacket(packet, limit, incoming)) return false;

    if (!known_ || bytes_ > limit - incoming) {
      size_t actual = 0;
      for (auto* entry = ffformatcontext(ctx)->packet_buffer.head; entry; entry = entry->next) {
        if (!AddPacket(&entry->pkt, limit, actual)) return false;
      }
      bytes_ = actual;
      known_ = true;
    }
    if (bytes_ > limit - incoming) return false;
    bytes_ += incoming;
    return true;
  }

 private:
  static bool AddPacket(const AVPacket* packet, size_t limit, size_t& total) {
    const auto add = [&](size_t size) {
      if (size > limit - total) return false;
      total += size;
      return true;
    };
    // Count metadata even for empty packets. Shared backing buffers are counted
    // conservatively per packet; padding and side data must not bypass the cap.
    if (!add(sizeof(PacketListEntry)) ||
        !add(packet->buf ? packet->buf->size : static_cast<size_t>(packet->size > 0 ? packet->size : 0))) return false;
    for (int i = 0; i < packet->side_data_elems; ++i) {
      if (!add(sizeof(AVPacketSideData)) || !add(packet->side_data[i].size)) return false;
    }
    return true;
  }

  size_t bytes_ = 0;
  bool known_ = false;
};

} // namespace ffmpeg
#endif
