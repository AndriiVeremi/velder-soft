import React from 'react';
import {
  View,
  Text as RNText,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../config/theme';
import { useAppTheme } from '../context/ThemeContext';
import {
  Globe,
  ShieldCheck,
  Award,
  Settings,
  GraduationCap,
  Heart,
  Code2,
  ExternalLink,
  Wrench,
} from 'lucide-react-native';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const HeroSection = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: 30px 20px;
  align-items: center;
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const Logo = styled.Image`
  width: 200px;
  height: 60px;
  resize-mode: contain;
  margin-bottom: 15px;
`;

const Tagline = styled(RNText)`
  font-size: 14px;
  color: ${(props) => props.theme.colors.textSecondary};
  text-align: center;
  font-style: italic;
`;

const Section = styled.View`
  padding: 20px;
`;

const Card = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
  border: 1px solid ${(props) => props.theme.colors.border};
  elevation: 2;
`;

const SectionTitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 12px;
`;

const SectionTitle = styled(RNText)`
  font-size: 18px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.primary};
  margin-left: 10px;
`;

const ContentText = styled(RNText)`
  font-size: 15px;
  color: ${(props) => props.theme.colors.text};
  line-height: 22px;
`;

const ServiceItem = styled.View`
  flex-direction: row;
  margin-bottom: 15px;
`;

const ServiceTextWrapper = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const ServiceTitle = styled(RNText)`
  font-size: 15px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const ServiceDesc = styled(RNText)`
  font-size: 13px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 2px;
`;

const DeveloperCard = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.accent};
  padding: 20px;
  border-radius: 15px;
  margin-top: 20px;
  margin-bottom: 40px;
  flex-direction: row;
  align-items: center;
  border: 1px dashed ${(props) => props.theme.colors.primary};
`;

const DeveloperInfo = styled.View`
  flex: 1;
  margin-left: 15px;
`;

const DevLabel = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.primary};
  font-weight: bold;
  text-transform: uppercase;
`;

const DevName = styled(RNText)`
  font-size: 18px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const WebsiteButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.primary};
  padding: 12px;
  border-radius: 8px;
  margin-top: 10px;
`;

const AboutCompanyScreen = () => {
  const { theme } = useAppTheme();

  return (
    <Container theme={theme}>
      <HeroSection theme={theme}>
        <Logo source={require('../../assets/velder.png')} />
        <Tagline theme={theme}>Lider w zakresie systemów gazów medycznych w Polsce</Tagline>
      </HeroSection>

      <Section>
        <Card theme={theme}>
          <SectionTitleRow>
            <Award size={22} color={theme.colors.primary} />
            <SectionTitle theme={theme}>35 lat doświadczenia</SectionTitle>
          </SectionTitleRow>
          <ContentText theme={theme}>
            Firma Velder działa na rynku od ponad 35 lat. Dynamicznie dostosowuje się do potrzeb
            rynku rozszerzając swoją ofertę, działa w kierunku podniesienia efektywności oraz
            konkurencyjności.
          </ContentText>
        </Card>

        <Card theme={theme}>
          <SectionTitleRow>
            <ShieldCheck size={22} color={theme.colors.primary} />
            <SectionTitle theme={theme}>Nasza specjalizacja</SectionTitle>
          </SectionTitleRow>
          <ContentText theme={theme}>
            Głównym celem działalności firmy jest budowanie sieci gazów medycznych, ze szczególnym
            uwzględnieniem budynków szpitali i zakładów opieki medycznej. Dostarczamy nowoczesne
            systemy dla tlenu, azotu, podtlenku azotu oraz powietrza medycznego.
          </ContentText>
        </Card>

        <Card theme={theme}>
          <SectionTitleRow>
            <Settings size={22} color={theme.colors.primary} />
            <SectionTitle theme={theme}>Nasze usługi</SectionTitle>
          </SectionTitleRow>

          <ServiceItem>
            <Settings size={18} color={theme.colors.textSecondary} />
            <ServiceTextWrapper>
              <ServiceTitle theme={theme}>Projektowanie i instalacja</ServiceTitle>
              <ServiceDesc theme={theme}>
                Indywidualne rozwiązania dostosowane do potrzeb placówek medycznych.
              </ServiceDesc>
            </ServiceTextWrapper>
          </ServiceItem>

          <ServiceItem>
            <Settings size={18} color={theme.colors.textSecondary} />
            <ServiceTextWrapper>
              <ServiceTitle theme={theme}>Montaż urządzeń</ServiceTitle>
              <ServiceDesc theme={theme}>
                Profesjonalny montaż stacji rozdzielczych, punktów poboru i zaworów.
              </ServiceDesc>
            </ServiceTextWrapper>
          </ServiceItem>

          <ServiceItem>
            <Wrench size={18} color={theme.colors.textSecondary} />
            <ServiceTextWrapper>
              <ServiceTitle theme={theme}>Serwis i konserwacja</ServiceTitle>
              <ServiceDesc theme={theme}>
                Regularna konserwacja zapewniająca bezawaryjność i zgodność з normami.
              </ServiceDesc>
            </ServiceTextWrapper>
          </ServiceItem>

          <ServiceItem>
            <GraduationCap size={18} color={theme.colors.textSecondary} />
            <ServiceTextWrapper>
              <ServiceTitle theme={theme}>Szkolenia</ServiceTitle>
              <ServiceDesc theme={theme}>
                Szkolenia dla personelu medycznego і technicznego.
              </ServiceDesc>
            </ServiceTextWrapper>
          </ServiceItem>
        </Card>

        <Card theme={theme}>
          <SectionTitleRow>
            <Heart size={22} color={theme.colors.primary} />
            <SectionTitle theme={theme}>Nasza misja</SectionTitle>
          </SectionTitleRow>
          <ContentText theme={theme}>
            Dostarczanie do zakładów opieki medycznej najwyższej jakości usług oraz niezawodnego
            sprzętu z zakresu sprawnie funkcjonującej sieci gazów medycznych, wspierając
            bezpieczeństwo pacjentów.
          </ContentText>
        </Card>

        <WebsiteButton theme={theme} onPress={() => Linking.openURL('https://velder.pl/')}>
          <Globe size={18} color="white" />
          <RNText style={{ color: 'white', fontWeight: 'bold', marginLeft: 10 }}>
            Odwiedź velder.pl
          </RNText>
        </WebsiteButton>

        <DeveloperCard
          theme={theme}
          onPress={() => Linking.openURL('https://www.linkedin.com/in/andriiveremii/')}
        >
          <View style={{ backgroundColor: theme.colors.primary, padding: 10, borderRadius: 12 }}>
            <Code2 size={24} color="white" />
          </View>
          <DeveloperInfo>
            <DevLabel theme={theme}>System opracowany przez</DevLabel>
            <DevName theme={theme}>Andrii Veremii (D@shuk)</DevName>
          </DeveloperInfo>
          <ExternalLink size={16} color={theme.colors.textSecondary} />
        </DeveloperCard>
      </Section>
    </Container>
  );
};

export default AboutCompanyScreen;
