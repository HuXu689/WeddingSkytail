package vn.wedding.invitation.wedding;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.common.Texts;
import static vn.wedding.invitation.access.AccessGate.number;

/** Coordinates are explicit configuration, never inferred from an address or an arbitrary URL. */
@Service
@Transactional
public class EventLocationService {
    private final JdbcTemplate db;
    public EventLocationService(JdbcTemplate db){this.db=db;}
    public record Input(Double latitude,Double longitude,boolean confirmed,String changeNotice,long expectedVersion) {}
    public record Location(BigDecimal latitude,BigDecimal longitude) {}

    public static Location validate(Input input){
        ApiErrors.require(input!=null,"Cấu hình vị trí không hợp lệ.");
        ApiErrors.require((input.latitude()==null)==(input.longitude()==null),"Nhập đủ vĩ độ và kinh độ hoặc để trống cả hai.");
        ApiErrors.require(input.expectedVersion()>=0,"Phiên bản không hợp lệ.");
        ApiErrors.require(input.changeNotice()==null||input.changeNotice().length()<=500,"Thông báo thay đổi tối đa 500 ký tự.");
        if(input.latitude()==null)return new Location(null,null);
        ApiErrors.require(Double.isFinite(input.latitude())&&Double.isFinite(input.longitude())
            &&input.latitude()>=-90&&input.latitude()<=90&&input.longitude()>=-180&&input.longitude()<=180,"Tọa độ nằm ngoài phạm vi hợp lệ.");
        ApiErrors.require(input.confirmed(),"Hãy xác nhận vị trí trên bản đồ trước khi lưu.");
        return new Location(BigDecimal.valueOf(input.latitude()).setScale(7,RoundingMode.HALF_UP),BigDecimal.valueOf(input.longitude()).setScale(7,RoundingMode.HALF_UP));
    }
    public Map<String,Object> save(UUID id,Input input){
        var location=validate(input);
        // Same lock order as AdminService and AccessGate; never lock event then wedding.
        db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE");
        var rows=db.queryForList("SELECT state,version,latitude,longitude FROM events WHERE id=? FOR UPDATE",id);
        ApiErrors.require(!rows.isEmpty(),"Buổi tiệc không tồn tại.");
        var row=rows.getFirst();
        ApiErrors.version(number(row,"version"),input.expectedVersion());
        String state=(String)row.get("state");
        ApiErrors.require("DRAFT".equals(state)||"PUBLISHED".equals(state),"Không thể sửa vị trí của buổi tiệc đã hủy.");
        boolean changed=!same(row.get("latitude"),location.latitude())||!same(row.get("longitude"),location.longitude());
        if(!changed)return Map.of("version",number(row,"version"));
        String notice=input.changeNotice()==null?null:Texts.text(input.changeNotice()).strip();
        boolean published="PUBLISHED".equals(state);
        ApiErrors.require(!published||(notice!=null&&!notice.isBlank()),"Hãy viết thông báo thay đổi vị trí cho khách.");
        db.update("UPDATE events SET latitude=?,longitude=?,change_notice=COALESCE(?,change_notice),revision=revision+?,version=version+1 WHERE id=?",
            location.latitude(),location.longitude(),published?notice:null,published?1:0,id);
        var auth=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String actor=auth==null?"owner":auth.getName();
        // Audit holds an ID only, never coordinates/address/recipient data.
        db.update("INSERT INTO audit(action,target,actor) VALUES('EVENT_LOCATION',?,?)",id.toString(),actor);
        return Map.of("version",number(row,"version")+1);
    }
    private static boolean same(Object stored,BigDecimal expected){
        return stored==null?expected==null:expected!=null&&new BigDecimal(stored.toString()).compareTo(expected)==0;
    }
}