#ifndef FFMPEG_FORMAT_CONTEXT_H
#define FFMPEG_FORMAT_CONTEXT_H

#include <napi.h>
#include <atomic>
#include <mutex>
#include <memory>
#include "common.h"

extern "C" {
#include <libavformat/avformat.h>
#include <libavformat/url.h>
#include <libavformat/internal.h>
}

// Platform-specific socket headers for RTSP
#ifdef _WIN32
  #ifndef WIN32_LEAN_AND_MEAN
    #define WIN32_LEAN_AND_MEAN
  #endif
  #include <winsock2.h>
  #include <ws2tcpip.h>
#else
  #include <sys/socket.h>
  #include <netinet/in.h>
#endif

// SDP direction enum from rtsp.h
enum RTSPSDPDirection {
    RTSP_DIRECTION_RECVONLY = 0,
    RTSP_DIRECTION_SENDONLY = 1,
    RTSP_DIRECTION_SENDRECV = 2,
    RTSP_DIRECTION_INACTIVE = 3,
};

// RTSP lower transport enum from rtsp.h
enum RTSPLowerTransport {
    RTSP_LOWER_TRANSPORT_UDP = 0,
    RTSP_LOWER_TRANSPORT_TCP = 1,
    RTSP_LOWER_TRANSPORT_UDP_MULTICAST = 2,
};

// Forward declaration for RTPDynamicProtocolHandler
typedef struct RTPDynamicProtocolHandler RTPDynamicProtocolHandler;

// RTPDynamicProtocolHandler structure (from rtpdec.h)
struct RTPDynamicProtocolHandler {
    const char *enc_name;          // Encoding name from SDP (e.g., "H264", "PCMA")
    // ... other fields we don't need to access
};

// Forward declarations matching FFmpeg's internal structures
typedef struct RTSPStream {
    void *rtp_handle;              // URLContext* - RTP stream handle (if UDP)
    void *transport_priv;          // RTP/RDT parse context if input
    int stream_index;              // corresponding stream index, -1 if none
    int interleaved_min;           // interleaved channel IDs for TCP
    int interleaved_max;
    char control_url[MAX_URL_SIZE]; // url for this stream (from SDP)

    // SDP fields - need correct layout to access sdp_direction
    int sdp_port;
    struct sockaddr_storage sdp_ip; // 128 bytes on most platforms
    int nb_include_source_addrs;
    void *include_source_addrs;
    int nb_exclude_source_addrs;
    void *exclude_source_addrs;
    int sdp_ttl;
    int sdp_payload_type;
    enum RTSPSDPDirection sdp_direction;
    char sdp_fmtp[2048];      // fmtp line from SDP (a=fmtp:PT ...)
    char sdp_mime_type[128];  // complete MIME type from rtpmap (e.g., "H264/90000" or "PCMA/8000/1")

    // Dynamic protocol handler - contains codec name from SDP
    const RTPDynamicProtocolHandler *dynamic_handler;
} RTSPStream;

typedef struct RTSPState {
    const void *av_class;          // AVClass* - using void* to avoid 'class' keyword
    void *rtsp_hd;                 // URLContext* - RTSP TCP connection handle
    int nb_rtsp_streams;           // number of items in rtsp_streams array
    RTSPStream **rtsp_streams;     // streams in this session

    // Need to include these fields to get correct offset to lower_transport
    int state;                     // enum RTSPClientState
    int64_t seek_timestamp;
    int seq;
    char session_id[512];
    int timeout;
    int64_t last_cmd_time;
    int transport;                 // enum RTSPTransport
    enum RTSPLowerTransport lower_transport;  // The field we want!
} RTSPState;

namespace ffmpeg {

class FormatContext : public Napi::ObjectWrap<FormatContext> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  FormatContext(const Napi::CallbackInfo& info);
  ~FormatContext();

  AVFormatContext* Get() { return ctx_; }
  const AVFormatContext* Get() const { return ctx_; }
  bool IsOutput() const { return is_output_; }

private:
  friend class AVOptionWrapper;
  friend class FCOpenInputWorker;
  friend class FCFindStreamInfoWorker;
  friend class FCReadFrameWorker;
  friend class FCSeekFrameWorker;
  friend class FCSeekFileWorker;
  friend class FCWriteHeaderWorker;
  friend class FCWriteFrameWorker;
  friend class FCInterleavedWriteFrameWorker;
  friend class FCWriteTrailerWorker;
  friend class FCOpenOutputWorker;
  friend class FCCloseOutputWorker;
  friend class FCCloseInputWorker;
  friend class FCDisposeWorker;
  friend class FCFlushWorker;
  friend class FCSendRTSPPacketWorker;

  static thread_local Napi::FunctionReference constructor;

  AVFormatContext* ctx_ = nullptr;
  bool is_output_ = false;

  Napi::Value AllocContext(const Napi::CallbackInfo& info);
  Napi::Value AllocOutputContext2(const Napi::CallbackInfo& info);
  Napi::Value FreeContext(const Napi::CallbackInfo& info);
  Napi::Value CloseInputAsync(const Napi::CallbackInfo& info);
  Napi::Value CloseInputSync(const Napi::CallbackInfo& info);
  Napi::Value OpenOutputAsync(const Napi::CallbackInfo& info);
  Napi::Value OpenOutputSync(const Napi::CallbackInfo& info);
  Napi::Value CloseOutputAsync(const Napi::CallbackInfo& info);
  Napi::Value CloseOutputSync(const Napi::CallbackInfo& info);
  Napi::Value OpenInputAsync(const Napi::CallbackInfo& info);
  Napi::Value OpenInputSync(const Napi::CallbackInfo& info);
  Napi::Value FindStreamInfoAsync(const Napi::CallbackInfo& info);
  Napi::Value FindStreamInfoSync(const Napi::CallbackInfo& info);
  Napi::Value ReadFrameAsync(const Napi::CallbackInfo& info);
  Napi::Value ReadFrameSync(const Napi::CallbackInfo& info);
  Napi::Value SeekFrameAsync(const Napi::CallbackInfo& info);
  Napi::Value SeekFrameSync(const Napi::CallbackInfo& info);
  Napi::Value SeekFileAsync(const Napi::CallbackInfo& info);
  Napi::Value WriteHeaderAsync(const Napi::CallbackInfo& info);
  Napi::Value WriteHeaderSync(const Napi::CallbackInfo& info);
  Napi::Value WriteFrameAsync(const Napi::CallbackInfo& info);
  Napi::Value WriteFrameSync(const Napi::CallbackInfo& info);
  Napi::Value InterleavedWriteFrameAsync(const Napi::CallbackInfo& info);
  Napi::Value InterleavedWriteFrameSync(const Napi::CallbackInfo& info);
  Napi::Value WriteTrailerAsync(const Napi::CallbackInfo& info);
  Napi::Value WriteTrailerSync(const Napi::CallbackInfo& info);
  Napi::Value FlushAsync(const Napi::CallbackInfo& info);
  Napi::Value FlushSync(const Napi::CallbackInfo& info);
  Napi::Value NewStream(const Napi::CallbackInfo& info);
  Napi::Value GetStreams(const Napi::CallbackInfo& info);
  Napi::Value GetNbStreams(const Napi::CallbackInfo& info);
  Napi::Value DumpFormat(const Napi::CallbackInfo& info);
  Napi::Value FindBestStream(const Napi::CallbackInfo& info);
  Napi::Value GetRTSPStreamInfo(const Napi::CallbackInfo& info);
  Napi::Value SendRTSPPacketAsync(const Napi::CallbackInfo& info);
  Napi::Value SendRTSPPacketSync(const Napi::CallbackInfo& info);
  Napi::Value Interrupt(const Napi::CallbackInfo& info);
  Napi::Value DisposeAsync(const Napi::CallbackInfo& info);

  Napi::Value GetUrl(const Napi::CallbackInfo& info);
  void SetUrl(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetStartTime(const Napi::CallbackInfo& info);

  Napi::Value GetDuration(const Napi::CallbackInfo& info);

  Napi::Value GetBitRate(const Napi::CallbackInfo& info);
  
  Napi::Value GetFlags(const Napi::CallbackInfo& info);
  void SetFlagsAccessor(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetProbesize(const Napi::CallbackInfo& info);
  void SetProbesize(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetMaxAnalyzeDuration(const Napi::CallbackInfo& info);
  void SetMaxAnalyzeDuration(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetMaxInterleaveDelta(const Napi::CallbackInfo& info);
  void SetMaxInterleaveDelta(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetMetadata(const Napi::CallbackInfo& info);
  void SetMetadata(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetIformat(const Napi::CallbackInfo& info);
  Napi::Value GetOformat(const Napi::CallbackInfo& info);
  void SetOformat(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetStrictStdCompliance(const Napi::CallbackInfo& info);
  void SetStrictStdCompliance(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetMaxStreams(const Napi::CallbackInfo& info);
  void SetMaxStreams(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetNbPrograms(const Napi::CallbackInfo& info);

  Napi::Value GetPbBytes(const Napi::CallbackInfo& info);

  Napi::Value GetProbeScore(const Napi::CallbackInfo& info);

  void SetPb(const Napi::CallbackInfo& info, const Napi::Value& value);

  // Interrupt callback mechanism for cancelling blocking operations
  static int InterruptCallback(void* opaque);
  void RequestInterrupt();
  std::atomic<bool> interrupt_requested_{false};

  // Track active read operations to prevent closing while reading
  std::atomic<int> active_read_operations_{0};
};

} // namespace ffmpeg

#endif // FFMPEG_FORMAT_CONTEXT_H