/* eslint-disable @typescript-eslint/no-explicit-any */
import { HTMLContainer, RecordProps, Rectangle2d, ShapeUtil, T, TLShape, TLResizeInfo, resizeBox } from 'tldraw'

const SHAPE_TYPE = 'phone-frame'

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    [SHAPE_TYPE]: { w: number; h: number; screenName: string; content: string; state: string }
  }
}

type PhoneFrameShape = TLShape<typeof SHAPE_TYPE>

export class PhoneFrameShapeUtil extends ShapeUtil<PhoneFrameShape> {
  static override type = SHAPE_TYPE
  static override props: RecordProps<PhoneFrameShape> = {
    w: T.number,
    h: T.number,
    screenName: T.string,
    content: T.string,   // accumulated LLM text
    state: T.string,     // 'skeleton' | 'streaming' | 'done'
  }

  getDefaultProps() {
    return { w: 200, h: 380, screenName: '', content: '', state: 'skeleton' }
  }

  getGeometry(shape: PhoneFrameShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  override onResize(shape: any, info: TLResizeInfo<any>) {
    return resizeBox(shape, info)
  }

  component(shape: PhoneFrameShape) {
    // HTMLContainer is mandatory — plain divs don't work correctly on canvas
    return (
      <HTMLContainer style={{ overflow: 'hidden', borderRadius: 16, border: '2px solid #333', background: '#111' }}>
        <div style={{ padding: 12, color: 'white', fontSize: 10, whiteSpace: 'pre-wrap' }}>
          {shape.props.state === 'skeleton' ? 'Generating...' : shape.props.content}
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: PhoneFrameShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}